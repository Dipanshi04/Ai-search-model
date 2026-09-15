import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/jwt.js';

export const adminsRouter: Router = Router();

const ADMIN_ROLES = ['SUPER_ADMIN', 'RACE_MANAGER', 'CHECKIN_STAFF', 'ANALYTICS_VIEWER'] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && (ADMIN_ROLES as readonly string[]).includes(role);
}

// Sub-admin management — SUPER_ADMIN only. An admin account is just a User
// row with one of the admin roles; there's no separate table, so this is
// really a filtered view over Users plus creation/deletion for that subset.

adminsRouter.get('/', authenticate, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: [...ADMIN_ROLES] } },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: admins });
  } catch (error) {
    logger.error('List admins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
});

adminsRouter.post('/', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role } = req.body || {};
    if (!name || !email || !phone || !password) {
      res.status(400).json({ success: false, message: 'name, email, phone, and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }
    if (!isAdminRole(role)) {
      res.status(400).json({ success: false, message: `role must be one of: ${ADMIN_ROLES.join(', ')}` });
      return;
    }

    const passwordHash = await hashPassword(password);
    const admin = await prisma.user.create({
      data: { name, email: String(email).toLowerCase().trim(), phone: String(phone).trim(), passwordHash, role },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    logger.info(`Admin account created: ${admin.email} (${admin.role}) by ${req.user?.email}`);
    res.status(201).json({ success: true, data: admin });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'An account with this email or phone already exists' });
      return;
    }
    logger.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
});

adminsRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { role, password } = req.body || {};
    const existing = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!existing || !isAdminRole(existing.role)) {
      res.status(404).json({ success: false, message: 'Admin not found' });
      return;
    }
    if (role !== undefined && !isAdminRole(role)) {
      res.status(400).json({ success: false, message: `role must be one of: ${ADMIN_ROLES.join(', ')}` });
      return;
    }
    if (password !== undefined && String(password).length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const admin = await prisma.user.update({
      where: { id: req.params.id as string },
      data: {
        ...(role !== undefined && { role }),
        ...(password !== undefined && { passwordHash: await hashPassword(password) }),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    logger.info(`Admin account updated: ${admin.email} by ${req.user?.email}`);
    res.json({ success: true, data: admin });
  } catch (error) {
    logger.error('Update admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin' });
  }
});

adminsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    if (req.params.id === req.user?.userId) {
      res.status(400).json({ success: false, message: "You can't remove your own account" });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!existing || !isAdminRole(existing.role)) {
      res.status(404).json({ success: false, message: 'Admin not found' });
      return;
    }
    await prisma.user.delete({ where: { id: req.params.id as string } });
    logger.info(`Admin account removed: ${existing.email} by ${req.user?.email}`);
    res.json({ success: true, message: 'Admin removed' });
  } catch (error) {
    logger.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove admin' });
  }
});
