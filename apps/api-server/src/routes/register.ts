import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import bcrypt from 'bcryptjs';
import { generateQRCode } from '../utils/qrcode.js';

export const registerRouter: Router = Router();

registerRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, category, gender, companyName, eventId: reqEventId, emergencyContact, emergencyPhone, bloodGroup, tshirtSize } = req.body;

    if (!name || !email || !phone || !category || !gender) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash('marathon2026', 12);
      user = await prisma.user.create({
        data: { email, phone, name, passwordHash },
      });
    }

    // Get event
    let event;
    if (reqEventId) {
      event = await prisma.event.findUnique({ where: { id: reqEventId } });
    } else {
      event = await prisma.event.findFirst({ where: { status: { in: ['UPCOMING', 'ACTIVE'] } }, orderBy: { date: 'asc' } });
    }
    if (!event) {
      res.status(400).json({ success: false, message: 'No active event for registration' });
      return;
    }

    // Generate BIB number with retry for race conditions
    let bibNumber = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const lastParticipant = await prisma.participant.findFirst({
        where: { eventId: event.id },
        orderBy: { bibNumber: 'desc' },
      });
      const lastNum = lastParticipant ? parseInt(lastParticipant.bibNumber.replace('ISA', '')) : 0;
      bibNumber = `ISA${(lastNum + 1 + attempt).toString().padStart(4, '0')}`;
      const existing = await prisma.participant.findUnique({ where: { bibNumber } });
      if (!existing) break;
    }

    // Find or create company
    let companyId = undefined;
    if (companyName) {
      let company = await prisma.company.findUnique({ where: { name: companyName } });
      if (!company) {
        company = await prisma.company.create({ data: { name: companyName } });
      }
      companyId = company.id;
    }

    // Create participant
    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        userId: user.id,
        companyId,
        bibNumber,
        category,
        gender,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        emergencyContact,
        emergencyPhone,
        bloodGroup: bloodGroup || null,
        tshirtSize: tshirtSize || null,
      },
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
    });

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(bibNumber);
    await prisma.participant.update({
      where: { id: participant.id },
      data: { qrCodeUrl: qrCodeDataUrl },
    });

    logger.info(`New registration: ${bibNumber} - ${name}`);
    res.json({
      success: true,
      data: {
        participant,
        bibNumber,
        qrCodeUrl: `/api/v1/participants/${participant.id}/qr`,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});