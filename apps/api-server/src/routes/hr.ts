import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { comparePassword, generateAccessToken, hashPassword, verifyToken } from '../utils/jwt.js';
import { generateQRCode } from '../utils/qrcode.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const hrRouter = Router();

function hrAuth(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }
    const token = authHeader.split(' ')[1]!;
    const decoded = verifyToken(token);
    if (decoded.role !== 'HR') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    (req as any).hr = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

hrRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password required' });
      return;
    }

    const bulkReg = await prisma.bulkRegistration.findUnique({ where: { hrEmail: email } });
    if (!bulkReg) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isValid = await comparePassword(password, bulkReg.hrPasswordHash);
    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = generateAccessToken({
      userId: bulkReg.id,
      email: bulkReg.hrEmail,
      role: 'HR',
    });

    logger.info(`HR logged in: ${bulkReg.hrEmail} (${bulkReg.companyName})`);

    res.json({
      success: true,
      data: {
        user: {
          id: bulkReg.id,
          hrName: bulkReg.hrName,
          hrEmail: bulkReg.hrEmail,
          companyName: bulkReg.companyName,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('HR login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

hrRouter.get('/me', hrAuth, async (req: Request, res: Response) => {
  try {
    const hrId = (req as any).hr.userId;

    const bulkReg = await prisma.bulkRegistration.findUnique({
      where: { id: hrId },
      select: {
        id: true,
        companyName: true,
        hrName: true,
        hrEmail: true,
        numberOfRegistrations: true,
        paymentCompleted: true,
      },
    });

    if (!bulkReg) {
      res.status(404).json({ success: false, message: 'HR profile not found' });
      return;
    }

    const usedCount = await prisma.participant.count({
      where: { bulkRegistrationId: hrId },
    });

    res.json({
      success: true,
      data: {
        ...bulkReg,
        usedRegistrations: usedCount,
        remainingRegistrations: bulkReg.numberOfRegistrations - usedCount,
      },
    });
  } catch (error) {
    logger.error('HR me error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

hrRouter.get('/participants', hrAuth, async (req: Request, res: Response) => {
  try {
    const hrId = (req as any).hr.userId;

    const participants = await prisma.participant.findMany({
      where: { bulkRegistrationId: hrId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: participants });
  } catch (error) {
    logger.error('HR participants error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch participants' });
  }
});

hrRouter.post('/participants', hrAuth, async (req: Request, res: Response) => {
  try {
    const hrId = (req as any).hr.userId;
    const { name, email, phone, category, gender, emergencyContact, emergencyPhone, bloodGroup, tshirtSize } = req.body as {
      name: string; email: string; phone: string; category: string; gender: string;
      emergencyContact?: string; emergencyPhone?: string; bloodGroup?: string; tshirtSize?: string;
    };

    if (!name || !email || !phone || !category || !gender) {
      res.status(400).json({ success: false, message: 'Missing required fields: name, email, phone, category, gender' });
      return;
    }

    const bulkReg = await prisma.bulkRegistration.findUnique({ where: { id: hrId } });
    if (!bulkReg) {
      res.status(404).json({ success: false, message: 'HR profile not found' });
      return;
    }

    const usedCount = await prisma.participant.count({ where: { bulkRegistrationId: hrId } });
    if (usedCount >= bulkReg.numberOfRegistrations) {
      res.status(400).json({ success: false, message: 'Registration limit reached. No slots remaining.' });
      return;
    }

    const event = await prisma.event.findFirst({ where: { status: 'UPCOMING' } });
    if (!event) {
      res.status(400).json({ success: false, message: 'No active event for registration' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const phoneUser = await prisma.user.findUnique({ where: { phone } });
      if (phoneUser) {
        res.status(409).json({ success: false, message: `Phone ${phone} is already registered` });
        return;
      }
      const passwordHash = await hashPassword('marathon2026');
      user = await prisma.user.create({ data: { email, phone, name, passwordHash } });
    }

    const lastParticipant = await prisma.participant.findFirst({
      where: { eventId: event.id },
      orderBy: { bibNumber: 'desc' },
    });
    const lastNum = lastParticipant ? parseInt(lastParticipant.bibNumber.replace('ISA', '')) : 0;
    const bibNumber = `ISA${(lastNum + 1).toString().padStart(4, '0')}`;

    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        userId: user.id,
        companyId: bulkReg.companyId,
        bulkRegistrationId: hrId,
        bibNumber,
        category: category as any,
        gender: gender as any,
        status: 'REGISTERED',
        paymentStatus: 'COMPLETED',
        paymentAmount: 0,
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
        bloodGroup: bloodGroup || null,
        tshirtSize: tshirtSize || null,
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    const qrCodeDataUrl = await generateQRCode(bibNumber);
    await prisma.participant.update({
      where: { id: participant.id },
      data: { qrCodeUrl: qrCodeDataUrl },
    });

    logger.info(`HR bulk registration: ${bibNumber} - ${name} by ${bulkReg.hrEmail}`);

    res.status(201).json({
      success: true,
      data: { ...participant, qrCodeUrl: `/api/v1/participants/${participant.id}/qr` },
    });
  } catch (error: any) {
    logger.error('HR participant creation error:', error);
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to register participant' });
  }
});

hrRouter.post('/participants/csv', hrAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const hrId = (req as any).hr.userId;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      return;
    }

    const bulkReg = await prisma.bulkRegistration.findUnique({ where: { id: hrId } });
    if (!bulkReg) {
      res.status(404).json({ success: false, message: 'HR profile not found' });
      return;
    }

    const usedCount = await prisma.participant.count({ where: { bulkRegistrationId: hrId } });
    const remaining = bulkReg.numberOfRegistrations - usedCount;

    let records: Record<string, string>[];
    try {
      const csvString = req.file.buffer.toString('utf-8');
      records = parse(csvString, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      res.status(400).json({ success: false, message: 'Invalid CSV format. Please check headers and formatting.' });
      return;
    }

    if (records.length === 0) {
      res.status(400).json({ success: false, message: 'CSV file is empty' });
      return;
    }

    if (records.length > remaining) {
      res.status(400).json({
        success: false,
        message: `CSV has ${records.length} entries but only ${remaining} slot${remaining !== 1 ? 's' : ''} remaining.`,
        data: { csvRows: records.length, remaining, used: usedCount, max: bulkReg.numberOfRegistrations },
      });
      return;
    }

    const requiredColumns = ['name', 'email', 'phone', 'category', 'gender'];
    const csvHeaders = Object.keys(records[0] || {}).map(h => h.toLowerCase().trim());
    const missingColumns = requiredColumns.filter(col => !csvHeaders.includes(col));
    if (missingColumns.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}. Required: name, email, phone, category, gender`,
      });
      return;
    }

    const event = await prisma.event.findFirst({ where: { status: 'UPCOMING' } });
    if (!event) {
      res.status(400).json({ success: false, message: 'No active event for registration' });
      return;
    }

    const lastParticipant = await prisma.participant.findFirst({
      where: { eventId: event.id },
      orderBy: { bibNumber: 'desc' },
    });
    let lastNum = lastParticipant ? parseInt(lastParticipant.bibNumber.replace('ISA', '')) : 0;

    const results: { success: boolean; name: string; email: string; bibNumber?: string; error?: string }[] = [];
    let created = 0;

    for (const record of records) {
      const name = record.name?.trim();
      const email = record.email?.trim().toLowerCase();
      const phone = record.phone?.trim();
      const category = record.category?.trim().toUpperCase();
      const gender = record.gender?.trim().toUpperCase();
      const emergencyContact = record.emergencycontact?.trim() || record.emergency_contact?.trim() || null;
      const emergencyPhone = record.emergencyphone?.trim() || record.emergency_phone?.trim() || null;
      const bloodGroup = record.bloodgroup?.trim() || record.blood_group?.trim() || null;
      const tshirtSize = record.tshirtsize?.trim() || record.tshirt_size?.trim() || null;

      if (!name || !email || !phone || !category || !gender) {
        results.push({ success: false, name: name || 'N/A', email: email || 'N/A', error: 'Missing required fields' });
        continue;
      }

      if (!['RUN_3K', 'RUN_5K'].includes(category)) {
        results.push({ success: false, name, email, error: `Invalid category: ${category}. Must be RUN_3K or RUN_5K` });
        continue;
      }

      if (!['MALE', 'FEMALE', 'NON_BINARY'].includes(gender)) {
        results.push({ success: false, name, email, error: `Invalid gender: ${gender}. Must be MALE, FEMALE, or NON_BINARY` });
        continue;
      }

      try {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const phoneUser = await prisma.user.findUnique({ where: { phone } });
          if (phoneUser) {
            results.push({ success: false, name, email, error: `Phone ${phone} already registered` });
            continue;
          }
          const passwordHash = await hashPassword('marathon2026');
          user = await prisma.user.create({ data: { email, phone, name, passwordHash } });
        }

        lastNum++;
        const bibNumber = `ISA${lastNum.toString().padStart(4, '0')}`;

        const participant = await prisma.participant.create({
          data: {
            eventId: event.id,
            userId: user.id,
            companyId: bulkReg.companyId,
            bulkRegistrationId: hrId,
            bibNumber,
            category: category as any,
            gender: gender as any,
            status: 'REGISTERED',
            paymentStatus: 'COMPLETED',
            paymentAmount: 0,
            emergencyContact,
            emergencyPhone,
            bloodGroup,
            tshirtSize,
          },
        });

        const qrCodeDataUrl = await generateQRCode(bibNumber);
        await prisma.participant.update({ where: { id: participant.id }, data: { qrCodeUrl: qrCodeDataUrl } });

        results.push({ success: true, name, email, bibNumber });
        created++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          results.push({ success: false, name, email, error: 'Duplicate entry' });
        } else {
          results.push({ success: false, name, email, error: err.message || 'Unknown error' });
        }
      }
    }

    logger.info(`HR CSV upload: ${created}/${records.length} created by ${bulkReg.hrEmail}`);

    res.json({
      success: true,
      data: {
        total: records.length,
        created,
        failed: records.length - created,
        results,
      },
    });
  } catch (error) {
    logger.error('HR CSV upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to process CSV' });
  }
});
