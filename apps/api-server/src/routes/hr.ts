import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { comparePassword, generateAccessToken, hashPassword, verifyToken, generateResetToken, verifyResetToken } from '../utils/jwt.js';
import { generateQRCode } from '../utils/qrcode.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { sendPinEmail, sendWelcomeEmail } from '../services/email.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const hrRouter: Router = Router();

function hrAuth(req: Request, res: Response, next: NextFunction) {
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

hrRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      res.status(400).json({ success: false, message: 'Email required' });
      return;
    }

    const bulkReg = await prisma.bulkRegistration.findUnique({ where: { hrEmail: email } });
    
    // Always return success to prevent email enumeration
    if (!bulkReg) {
      res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
      return;
    }

    // Generate reset token
    const resetToken = generateResetToken({
      hrId: bulkReg.id,
      email: bulkReg.hrEmail,
      type: 'hr_password_reset',
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/hr-reset-password?token=${resetToken}`;

    // Send reset email
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #E91E8C 0%, #9C27B0 50%, #2196F3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ISA MARATHON</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
          <p style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">Reset Your HR Portal Password</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Hello <strong>${bulkReg.hrName}</strong>,</p>
          <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">Click the button below to reset your HR Portal password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #E91E8C 0%, #9C27B0 50%, #2196F3 100%); padding: 16px 32px; border-radius: 10px; color: #fff; font-weight: 700; text-decoration: none;">Reset Password</a>
          <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">If you didn't request this, please ignore this email.</p>
        </div>
        <p style="margin: 24px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">© 2026 ISA Marathon. All rights reserved.</p>
      </div>
    `;

    const { sendEmail } = await import('../services/email.js');
    await sendEmail({ 
      to: bulkReg.hrEmail, 
      subject: 'Reset Your ISA Marathon HR Portal Password', 
      html 
    });

    logger.info(`HR password reset requested: ${email}`);

    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    logger.error('HR forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
});

hrRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    if (!token || !password) {
      res.status(400).json({ success: false, message: 'Token and password required' });
      return;
    }

    let payload;
    try {
      payload = verifyResetToken(token);
    } catch {
      res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      return;
    }

    if (payload.type !== 'hr_password_reset') {
      res.status(400).json({ success: false, message: 'Invalid reset token' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const passwordHash = await hashPassword(password);
    
    await prisma.bulkRegistration.update({
      where: { id: payload.hrId },
      data: { hrPasswordHash: passwordHash },
    });

    logger.info(`HR password reset completed: ${payload.email}`);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('HR reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
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

hrRouter.get('/event/current', hrAuth, async (req: Request, res: Response) => {
  try {
    let event = await prisma.event.findFirst({
      where: { status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, status: true, date: true, registrationOpen: true },
    });
    if (!event) {
      event = await prisma.event.findFirst({
        where: { status: 'UPCOMING' },
        orderBy: { date: 'asc' },
        select: { id: true, name: true, status: true, date: true, registrationOpen: true },
      });
    }
    if (!event) {
      res.status(404).json({ success: false, message: 'No active event found' });
      return;
    }
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('HR get current event error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch event' });
  }
});

hrRouter.get('/participants', hrAuth, async (req: Request, res: Response) => {
  try {
    const hrId = (req as any).hr.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [participants, total] = await Promise.all([
      prisma.participant.findMany({
        where: { bulkRegistrationId: hrId },
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.participant.count({
        where: { bulkRegistrationId: hrId },
      }),
    ]);

    res.json({
      success: true,
      data: participants,
      pagination: { total, totalPages: Math.ceil(total / limit), page, limit },
    });
  } catch (error) {
    logger.error('HR participants error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch participants' });
  }
});

hrRouter.post('/participants', hrAuth, async (req: Request, res: Response) => {
  try {
    const hrId = (req as any).hr.userId;
    const { name, email, phone, category, gender, eventId: reqEventId, emergencyContact, emergencyPhone, bloodGroup, bloodDonation, tshirtSize } = req.body as {
      name: string; email: string; phone: string; category: string; gender: string; eventId?: string;
      emergencyContact?: string; emergencyPhone?: string; bloodGroup?: string; bloodDonation?: boolean; tshirtSize?: string;
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

    let event;
    if (reqEventId) {
      event = await prisma.event.findUnique({ where: { id: reqEventId } });
    } else {
      event = await prisma.event.findFirst({ where: { status: { in: ['ACTIVE', 'PAUSED'] } }, orderBy: { updatedAt: 'desc' } });
      if (!event) {
        event = await prisma.event.findFirst({ where: { status: 'UPCOMING' }, orderBy: { date: 'asc' } });
      }
    }
    if (!event) {
      res.status(400).json({ success: false, message: 'No active event for registration' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;
    let pin = '';
    if (!user) {
      const phoneUser = await prisma.user.findUnique({ where: { phone } });
      if (phoneUser) {
        res.status(409).json({ success: false, message: `Phone ${phone} is already registered` });
        return;
      }
      const passwordHash = await hashPassword('marathon2026');
      pin = String(Math.floor(1000 + Math.random() * 9000));
      const pinHash = await hashPassword(pin);
      user = await prisma.user.create({ data: { email, phone, name, passwordHash, pinHash } });
      isNewUser = true;
    } else if (!user.pinHash) {
      // Existing user without PIN - generate one
      pin = String(Math.floor(1000 + Math.random() * 9000));
      const pinHash = await hashPassword(pin);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { pinHash },
      });
      isNewUser = true;
    }

    // See routes/register.ts for why this is a single atomic counter
    // increment rather than read-max-and-retry — the latter can still
    // collide under a burst of concurrent requests.
    const { bibCounter } = await prisma.event.update({
      where: { id: event.id },
      data: { bibCounter: { increment: 1 } },
      select: { bibCounter: true },
    });
    const bibNumber = `ISA${bibCounter.toString().padStart(4, '0')}`;

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
        bloodDonation: bloodDonation === true,
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

    // Send welcome email and PIN email (async)
    if (isNewUser && pin) {
      sendWelcomeEmail(user.email, user.name, bibNumber, category).catch((e) => logger.error('Welcome email failed:', e));
      sendPinEmail(user.email, user.name, pin).catch((e) => logger.error('PIN email failed:', e));
    }

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

    let event;
    const reqEventId = req.query.eventId as string | undefined;
    if (reqEventId) {
      event = await prisma.event.findUnique({ where: { id: reqEventId } });
    } else {
      event = await prisma.event.findFirst({ where: { status: { in: ['ACTIVE', 'PAUSED'] } }, orderBy: { updatedAt: 'desc' } });
      if (!event) {
        event = await prisma.event.findFirst({ where: { status: 'UPCOMING' }, orderBy: { date: 'asc' } });
      }
    }
    if (!event) {
      res.status(400).json({ success: false, message: 'No active event for registration' });
      return;
    }

    const results: { success: boolean; name: string; email: string; bibNumber?: string; pin?: string; error?: string }[] = [];
    let created = 0;

    for (const record of records) {
      const name = record.name?.trim();
      const email = record.email?.trim().toLowerCase();
      const phone = record.phone?.trim();
      const gender = record.gender?.trim().toUpperCase();
      const emergencyContact = record.emergencycontact?.trim() || record.emergency_contact?.trim() || null;
      const emergencyPhone = record.emergencyphone?.trim() || record.emergency_phone?.trim() || null;
      const bloodGroup = record.bloodgroup?.trim() || record.blood_group?.trim() || null;
      const bloodDonation = record.blooddonation === 'true' || record.blood_donation === 'true' || record.blooddonation === 'TRUE' || record.blood_donation === 'TRUE';
      const tshirtSize = record.tshirtsize?.trim() || record.tshirt_size?.trim() || null;

      if (!name || !email || !phone || !gender) {
        results.push({ success: false, name: name || 'N/A', email: email || 'N/A', error: 'Missing required fields' });
        continue;
      }

      const categoryMap: Record<string, string> = {
        STUDENT: 'RUN_3K',
        PROFESSIONAL: 'RUN_5K',
        GENERAL: 'RUN_5K',
        '3K': 'RUN_3K',
        '5K': 'RUN_5K',
        '3KM': 'RUN_3K',
        '5KM': 'RUN_5K',
        FUN: 'RUN_3K',
        CHALLENGE: 'RUN_5K',
      };
      let category = record.category?.trim().toUpperCase();
      if (!category) {
        results.push({ success: false, name, email, error: 'Missing required field: category' });
        continue;
      }
      if (!['RUN_3K', 'RUN_5K'].includes(category)) {
        const mapped = categoryMap[category];
        if (!mapped) {
          results.push({ success: false, name, email, error: `Invalid category: ${category}. Must be RUN_3K or RUN_5K` });
          continue;
        }
        category = mapped;
      }

      if (!['MALE', 'FEMALE'].includes(gender)) {
        results.push({ success: false, name, email, error: `Invalid gender: ${gender}. Must be MALE or FEMALE` });
        continue;
      }

      try {
        let user = await prisma.user.findUnique({ where: { email } });
        let isNewUser = false;
        let pin = '';
        if (!user) {
          const phoneUser = await prisma.user.findUnique({ where: { phone } });
          if (phoneUser) {
            results.push({ success: false, name, email, error: `Phone ${phone} already registered` });
            continue;
          }
          const passwordHash = await hashPassword('marathon2026');
          pin = String(Math.floor(1000 + Math.random() * 9000));
          const pinHash = await hashPassword(pin);
          user = await prisma.user.create({ data: { email, phone, name, passwordHash, pinHash } });
          isNewUser = true;
        } else if (!user.pinHash) {
          // Existing user without PIN - generate one
          pin = String(Math.floor(1000 + Math.random() * 9000));
          const pinHash = await hashPassword(pin);
          user = await prisma.user.update({
            where: { id: user.id },
            data: { pinHash },
          });
          isNewUser = true;
        }

        // One atomic increment per row — see routes/register.ts for why
        // this replaced a read-max-and-retry approach (it could still
        // collide with a concurrent registration elsewhere, e.g. the
        // public register endpoint, under real traffic).
        const { bibCounter } = await prisma.event.update({
          where: { id: event.id },
          data: { bibCounter: { increment: 1 } },
          select: { bibCounter: true },
        });
        const bibNumber = `ISA${bibCounter.toString().padStart(4, '0')}`;

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
            bloodDonation,
            tshirtSize,
          },
        });

        const qrCodeDataUrl = await generateQRCode(bibNumber);
        await prisma.participant.update({ where: { id: participant.id }, data: { qrCodeUrl: qrCodeDataUrl } });

        results.push({ success: true, name, email, bibNumber, pin: pin || undefined });
        created++;

        // Send welcome email and PIN email (async)
        if (isNewUser && pin) {
          sendWelcomeEmail(user.email, user.name, bibNumber, category).catch((e) => logger.error('Welcome email failed:', e));
          sendPinEmail(user.email, user.name, pin).catch((e) => logger.error('PIN email failed:', e));
        }
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

hrRouter.get('/participants/csv/sample', hrAuth, (req: Request, res: Response) => {
  const csv = `name,email,phone,category,gender,emergencyContact,emergencyPhone,bloodGroup,tshirtSize
John Doe,john@example.com,9876543210,RUN_3K,MALE,Raj Doe,9876543211,O+,M
Jane Smith,jane@example.com,9876543212,RUN_5K,FEMALE,Priya Smith,9876543213,A+,S`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sample-participants.csv');
  res.send(csv);
});
