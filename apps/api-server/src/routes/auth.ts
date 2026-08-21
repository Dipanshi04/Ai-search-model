import { Router, Request, Response } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  comparePassword,
} from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export const authRouter: Router = Router();

authRouter.post(
  '/login',
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, phone: true, passwordHash: true, role: true },
      });

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

authRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          participants: {
            select: { id: true, bibNumber: true, category: true, eventId: true, status: true },
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
      logger.info(`User logged out: ${req.user!.email}`);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  }
);
