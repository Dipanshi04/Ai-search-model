import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import bcrypt from 'bcryptjs';
import { generateQRCode } from '../utils/qrcode.js';
import { sendPinEmail } from '../services/email.js';

export const registerRouter: Router = Router();

registerRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, category, gender, companyId: reqCompanyId, companyName, eventId: reqEventId, emergencyContact, emergencyPhone, bloodGroup, bloodDonation, tshirtSize } = req.body;

    if (!name || !email || !phone || !category || !gender) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;
    let pin = '';
    if (!user) {
      const passwordHash = await bcrypt.hash('marathon2026', 12);
      pin = String(Math.floor(1000 + Math.random() * 9000));
      const pinHash = await bcrypt.hash(pin, 12);
      user = await prisma.user.create({
        data: { email, phone, name, passwordHash, pinHash },
      });
      isNewUser = true;
    } else if (!user.pinHash) {
      // Existing user without PIN - generate one
      pin = String(Math.floor(1000 + Math.random() * 9000));
      const pinHash = await bcrypt.hash(pin, 12);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { pinHash },
      });
      isNewUser = true;
    }

    // Get event
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

    // Company: either an existing one picked from the dropdown (companyId —
    // no name-matching involved, so no risk of near-duplicate rows), or a
    // brand new one typed in via "Other" (companyName — normalized to
    // uppercase so "Tata", "TATA", "tata" from different people all land on
    // the same row instead of splintering into near-duplicates).
    let companyId: string | undefined = undefined;
    if (reqCompanyId) {
      const existing = await prisma.company.findUnique({ where: { id: reqCompanyId } });
      companyId = existing?.id;
    } else if (companyName) {
      const normalizedName = String(companyName).trim().toUpperCase();
      let company = await prisma.company.findUnique({ where: { name: normalizedName } });
      if (!company) {
        company = await prisma.company.create({ data: { name: normalizedName } });
      }
      companyId = company.id;
    }

    // Same person, same event, already registered before — don't silently
    // create a second bib every time the form is resubmitted (a failed or
    // abandoned payment used to do exactly that, leaving duplicate
    // PENDING_PAYMENT rows with no way back to the original one).
    const existingParticipant = await prisma.participant.findFirst({
      where: { userId: user.id, eventId: event.id },
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingParticipant) {
      if (existingParticipant.paymentStatus === 'COMPLETED') {
        res.status(409).json({
          success: false,
          message: `You're already registered for this event as BIB ${existingParticipant.bibNumber}. Check your email for details, or log into the Runner App with your PIN.`,
        });
        return;
      }

      // PENDING / FAILED — resume the same registration instead of minting
      // a new one. Category/gender/etc. may have changed since their first
      // attempt, so refresh those onto the existing row.
      const resumed = await prisma.participant.update({
        where: { id: existingParticipant.id },
        data: {
          category, gender, companyId: companyId ?? existingParticipant.companyId,
          emergencyContact, emergencyPhone,
          bloodGroup: bloodGroup || null,
          bloodDonation: bloodDonation === true,
          tshirtSize: tshirtSize || null,
        },
        include: {
          user: { select: { name: true, email: true } },
          company: { select: { name: true } },
        },
      });

      res.json({
        success: true,
        data: {
          participant: resumed,
          bibNumber: resumed.bibNumber,
          qrCodeUrl: `/api/v1/participants/${resumed.id}/qr`,
          pin: isNewUser ? pin : undefined,
          resumed: true,
        },
      });
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
        bloodDonation: bloodDonation === true,
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

    // Send the PIN immediately — it's their login credential and doesn't
    // depend on payment. The "Registration Confirmed" welcome email is
    // intentionally NOT sent here: payment isn't confirmed yet at this
    // point, so saying "confirmed" before that would be false. It goes out
    // once Cashfree's webhook actually confirms payment instead (see
    // routes/cashfree.ts).
    if (isNewUser && pin) {
      sendPinEmail(user.email, user.name, pin).catch((e) => logger.error('PIN email failed:', e));
    }

    res.json({
      success: true,
      data: {
        participant,
        bibNumber,
        qrCodeUrl: `/api/v1/participants/${participant.id}/qr`,
        // Only ever available right here — pin is bcrypt-hashed immediately
        // after this and the plaintext is discarded server-side. Only for a
        // brand-new account; an existing user re-registering already has
        // their real pin and shouldn't get a fresh one exposed here.
        pin: isNewUser ? pin : undefined,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});