import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
} from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registrationSchema } from '@isa/shared';
import { logger } from '../config/logger.js';
import { generateQRCode } from '../utils/qrcode.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registrationSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, email, phone, category, gender, companyId, companyName } = req.body;

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email or phone already exists',
        });
        return;
      }

      const hashedPassword = await hashPassword(req.body.password || 'password123');
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash: hashedPassword,
          role: 'PARTICIPANT',
        },
      });

      let company = null;
      if (companyId) {
        company = await prisma.company.findUnique({ where: { id: companyId } });
      } else if (companyName) {
        company = await prisma.company.upsert({
          where: { name: companyName },
          update: {},
          create: { name: companyName },
        });
      }

      const event = await prisma.event.findFirst({
        where: { status: { in: ['UPCOMING', 'ACTIVE'] } },
        orderBy: { date: 'asc' },
      });

      if (!event) {
        res.status(400).json({
          success: false,
          message: 'No active event available for registration',
        });
        return;
      }

      const participantCount = await prisma.participant.count({
        where: { eventId: event.id },
      });
      const bibNumber = `ISA${(participantCount + 1001).toString()}`;

      const participant = await prisma.participant.create({
        data: {
          eventId: event.id,
          userId: user.id,
          companyId: company?.id,
          bibNumber,
          category,
          gender,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING',
        },
        include: {
          event: true,
          company: true,
        },
      });

      // Generate QR code for this participant
      const qrCodeDataUrl = await generateQRCode(participant.bibNumber);
      await prisma.participant.update({
        where: { id: participant.id },
        data: { qrCodeUrl: qrCodeDataUrl },
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const { redis } = await import('../config/redis.js');
      await redis.set(`refresh:${user.id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

      logger.info(`User registered: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
          participant: {
            id: participant.id,
            bibNumber: participant.bibNumber,
            category: participant.category,
            status: participant.status,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  }
);

authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const { redis } = await import('../config/redis.js');
      await redis.set(`refresh:${user.id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

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

      const user = await prisma.user.findUnique({ where: { email } });

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

      const { redis } = await import('../config/redis.js');
      await redis.set(`refresh:${user.id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

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

authRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarUrl: true,
          participants: {
            include: {
              event: { select: { id: true, name: true, slug: true } },
              company: { select: { id: true, name: true } },
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
  '/logout',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { redis } = await import('../config/redis.js');
      await redis.del(`refresh:${req.user!.userId}`);
      logger.info(`User logged out: ${req.user!.email}`);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  }
);
