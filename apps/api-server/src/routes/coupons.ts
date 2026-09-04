import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const couponsRouter: Router = Router();

function normalizeCode(code: unknown): string {
  return String(code || '').trim().toUpperCase();
}

// Shared by /validate and cashfree.ts's own re-check at payment time — a
// coupon is only usable while active, not past its expiry, and under its
// usage limit (null limit = unlimited).
export async function findRedeemableCoupon(rawCode: string) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return null;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return null;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return null;
  return coupon;
}

couponsRouter.get('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: coupons });
  } catch (error) {
    logger.error('List coupons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
});

couponsRouter.post('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { code, discountPercent, active, usageLimit, expiresAt } = req.body;
    const normalized = normalizeCode(code);
    const percent = Number(discountPercent);

    if (!normalized) {
      res.status(400).json({ success: false, message: 'code is required' });
      return;
    }
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      res.status(400).json({ success: false, message: 'discountPercent must be an integer between 1 and 100' });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalized,
        discountPercent: percent,
        active: active !== false,
        usageLimit: usageLimit === '' || usageLimit == null ? null : Number(usageLimit),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json({ success: true, data: coupon });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
      return;
    }
    logger.error('Create coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
});

couponsRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { code, discountPercent, active, usageLimit, expiresAt } = req.body;
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Coupon not found' });
      return;
    }

    if (discountPercent !== undefined) {
      const percent = Number(discountPercent);
      if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
        res.status(400).json({ success: false, message: 'discountPercent must be an integer between 1 and 100' });
        return;
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id as string },
      data: {
        ...(code !== undefined && { code: normalizeCode(code) }),
        ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
        ...(active !== undefined && { active: active === true }),
        ...(usageLimit !== undefined && { usageLimit: usageLimit === '' || usageLimit == null ? null : Number(usageLimit) }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });
    res.json({ success: true, data: coupon });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
      return;
    }
    logger.error('Update coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to update coupon' });
  }
});

couponsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Coupon not found' });
      return;
    }
    await prisma.coupon.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    logger.error('Delete coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
});

// Public — called from the registration payment step as the runner types a
// code, before any payment exists. Never trusted as the final word on the
// discount actually charged; cashfree.ts re-validates independently.
couponsRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const coupon = await findRedeemableCoupon(req.body?.code);
    if (!coupon) {
      res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
      return;
    }
    res.json({ success: true, data: { code: coupon.code, discountPercent: coupon.discountPercent } });
  } catch (error) {
    logger.error('Validate coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
});
