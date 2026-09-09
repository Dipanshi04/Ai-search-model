import { Router, Request, Response } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  comparePassword,
} from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import bcrypt from 'bcryptjs';
import { sendPinEmail } from '../services/email.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { PACKAGE_ROOT } from '../config/paths.js';

export const authRouter: Router = Router();

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, or WebP allowed'));
  },
});

authRouter.post(
  '/login',
  async (req: Request, res: Response) => {
    try {
      const { email, pin } = req.body;
      if (!email || !pin) {
        res.status(400).json({ success: false, message: 'Email and PIN required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, phone: true, pinHash: true, role: true },
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      if (!user.pinHash) {
        res.status(401).json({ success: false, message: 'No PIN set. Use "Reset PIN" to get a new PIN.' });
        return;
      }

      const isValid = await comparePassword(pin, user.pinHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid PIN' });
        return;
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }
);

authRouter.post(
  '/admin-login',
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, passwordHash: true, role: true },
      });

      if (!user || !['SUPER_ADMIN', 'RACE_MANAGER', 'CHECKIN_STAFF', 'ANALYTICS_VIEWER'].includes(user.role)) {
        res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        return;
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        return;
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      logger.info(`Admin logged in: ${email} (${user.role})`);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      logger.error('Admin login error:', error);
      res.status(500).json({ success: false, message: 'Admin login failed' });
    }
  }
);

authRouter.post(
  '/reset-pin',
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ success: true, message: 'If the email exists, a new PIN has been sent' });
        return;
      }

      // Generate 4-digit PIN
      const pin = String(Math.floor(1000 + Math.random() * 9000));
      const pinHash = await bcrypt.hash(pin, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { pinHash },
      });

      // Send PIN email
      await sendPinEmail(user.email, user.name, pin);

      logger.info(`PIN reset for: ${email}`);

      res.json({ success: true, message: 'If the email exists, a new PIN has been sent' });
    } catch (error) {
      logger.error('Reset PIN error:', error);
      res.status(500).json({ success: false, message: 'Failed to reset PIN' });
    }
  }
);

authRouter.post(
  '/change-pin',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { currentPin, newPin } = req.body;
      if (!currentPin || !newPin) {
        res.status(400).json({ success: false, message: 'Current and new PIN required' });
        return;
      }
      if (!/^\d{4}$/.test(newPin)) {
        res.status(400).json({ success: false, message: 'New PIN must be 4 digits' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, email: true, name: true, pinHash: true },
      });

      if (!user?.pinHash) {
        res.status(401).json({ success: false, message: 'No PIN set. Use "Reset PIN" first.' });
        return;
      }

      const isValid = await comparePassword(currentPin, user.pinHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Current PIN is incorrect' });
        return;
      }

      const pinHash = await bcrypt.hash(newPin, 12);
      await prisma.user.update({ where: { id: user.id }, data: { pinHash } });

      // A PIN change is a credential change — email it the same way a reset
      // does, so the account owner has a record of it (and a heads-up if
      // they didn't make the change themselves).
      sendPinEmail(user.email, user.name, newPin).catch((e) => logger.error('PIN change email failed:', e));

      logger.info(`PIN changed for user: ${req.user!.email}`);

      res.json({ success: true, message: 'PIN updated successfully' });
    } catch (error) {
      logger.error('Change PIN error:', error);
      res.status(500).json({ success: false, message: 'Failed to change PIN' });
    }
  }
);

authRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true, name: true, email: true, phone: true, role: true, avatarUrl: true,
          participants: {
            select: {
              id: true, bibNumber: true, category: true, eventId: true, status: true, paymentStatus: true, kitDistributed: true, certificateUrl: true,
              company: { select: { status: true } },
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('Get me error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  }
);

authRouter.post(
  '/me/photo',
  authenticate,
  uploadPhoto.single('photo'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No photo uploaded' });
        return;
      }
      const ext = `.${req.file.mimetype.split('/')[1]}`;
      const filename = `${uuidv4()}${ext}`;
      const uploadDir = path.join(PACKAGE_ROOT, 'uploads', 'avatars');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);

      const avatarUrl = `/uploads/avatars/${filename}`;
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { avatarUrl },
        select: { id: true, avatarUrl: true },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('Photo upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }
  }
);

authRouter.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      logger.info(`User logged out: ${req.user!.email}`);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  }
);
