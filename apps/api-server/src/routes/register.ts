import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import bcrypt from 'bcryptjs';
import { generateQRCode } from '../utils/qrcode.js';
import { isValidEmail } from '../utils/validation.js';
import { sendPinEmail } from '../services/email.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { PACKAGE_ROOT } from '../config/paths.js';

export const registerRouter: Router = Router();

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, or WebP allowed'));
  },
});

registerRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, category, gender, companyId: reqCompanyId, companyName, eventId: reqEventId, emergencyContact, emergencyPhone, bloodGroup, bloodDonation, tshirtSize } = req.body;

    if (!name || !email || !phone || !category || !gender) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      return;
    }

    // Normalized so "Name@x.com" and "name@x.com" are the same account —
    // otherwise a runner who typed their email differently at registration
    // vs. login (or two different admins/forms) can't find their own account.
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    let isNewUser = false;
    let pin = '';
    if (!user) {
      const passwordHash = await bcrypt.hash('marathon2026', 12);
      pin = String(Math.floor(1000 + Math.random() * 9000));
      const pinHash = await bcrypt.hash(pin, 12);
      user = await prisma.user.create({
        data: { email: normalizedEmail, phone, name, passwordHash, pinHash },
      });
      isNewUser = true;
    } else {
      // A retry or resumed registration submits name/phone again — if they
      // corrected a typo (this is exactly how one production payment
      // failed: Cashfree rejected a phone number one digit short of a
      // valid Indian number), that correction needs to actually land on
      // the User row, not silently stick with whatever was entered the
      // very first time.
      const updateData: { name?: string; phone?: string; pinHash?: string } = {};
      if (name && name !== user.name) updateData.name = name;
      if (phone && phone !== user.phone) {
        const phoneOwner = await prisma.user.findUnique({ where: { phone } });
        if (phoneOwner && phoneOwner.id !== user.id) {
          res.status(409).json({ success: false, message: `Phone ${phone} is already registered to a different account.` });
          return;
        }
        updateData.phone = phone;
      }
      if (!user.pinHash) {
        pin = String(Math.floor(1000 + Math.random() * 9000));
        updateData.pinHash = await bcrypt.hash(pin, 12);
        isNewUser = true;
      }
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({ where: { id: user.id }, data: updateData });
      }
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
        company: { select: { name: true, status: true } },
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
          name, category, gender, companyId: companyId ?? existingParticipant.companyId,
          emergencyContact, emergencyPhone,
          bloodGroup: bloodGroup || null,
          bloodDonation: bloodDonation === true,
          tshirtSize: tshirtSize || null,
        },
        include: {
          user: { select: { name: true, email: true } },
          company: { select: { name: true, status: true } },
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

    // BIB numbers come from Event.bibCounter, allocated with a single
    // atomic UPDATE ... SET bib_counter = bib_counter + 1 — Postgres
    // serializes concurrent updates to the same row at the storage layer,
    // so every caller gets a distinct value with no read-then-write race
    // window at all. (A previous version read the current max bib and
    // retried on conflict, which still collided under bursts of
    // simultaneous registrations — e.g. PM2 running multiple cluster
    // instances — because competing requests could exhaust their retry
    // budget colliding with each other rather than converging.)
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
        companyId,
        bibNumber,
        name,
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
        company: { select: { name: true, status: true } },
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

// Called right after a successful registration response, before the runner
// has ever logged in (no token exists yet) — so this can't be gated behind
// `authenticate`. Instead it's gated by knowing both the userId AND the
// email on that account, the same two pieces of info the register form
// itself just collected, keeping it no more guessable than registration.
registerRouter.post('/:userId/photo', uploadPhoto.single('photo'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'email is required' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No photo uploaded' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId as string } });
    if (!user || user.email.toLowerCase() !== String(email).toLowerCase()) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const ext = `.${req.file.mimetype.split('/')[1]}`;
    const filename = `${uuidv4()}${ext}`;
    const uploadDir = path.join(PACKAGE_ROOT, 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });

    res.json({ success: true, data: { avatarUrl } });
  } catch (error) {
    logger.error('Registration photo upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});