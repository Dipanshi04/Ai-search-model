import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const couponsRouter: Router = Router();

function normalizeCode(code: unknown): string {
  return String(code || '').trim().toUpperCase();
}

// Shared by /validate and cashfree.ts's own re-check at payment time — a
// coupon is only usable while active, not past its expiry, under its usage
// limit (null limit = unlimited), and — if restricted to PREMIUM_ONLY —
// only for a participant whose company actually has PREMIUM status.
export async function findRedeemableCoupon(rawCode: string, isPremiumCompany = false) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return null;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return null;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return null;
  if (coupon.audience === 'PREMIUM_ONLY' && !isPremiumCompany) return null;
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

// Who actually redeemed this coupon — every payment attempt that carried
// this code, not just the ones that completed, so an admin can see
// abandoned/failed attempts too, not only the count in usedCount.
couponsRouter.get('/:id/usages', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id as string } });
    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found' });
      return;
    }
    const payments = await prisma.payment.findMany({
      where: { couponCode: coupon.code },
      orderBy: { createdAt: 'desc' },
      include: {
        participant: {
          select: {
            bibNumber: true,
            category: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    logger.error('List coupon usages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupon usages' });
  }
});

couponsRouter.post('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { code, discountPercent, active, usageLimit, expiresAt, audience } = req.body;
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
    if (audience !== undefined && audience !== 'ALL' && audience !== 'PREMIUM_ONLY') {
      res.status(400).json({ success: false, message: 'audience must be ALL or PREMIUM_ONLY' });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalized,
        discountPercent: percent,
        active: active !== false,
        usageLimit: usageLimit === '' || usageLimit == null ? null : Number(usageLimit),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        audience: audience === 'PREMIUM_ONLY' ? 'PREMIUM_ONLY' : 'ALL',
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
    const { code, discountPercent, active, usageLimit, expiresAt, audience } = req.body;
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
    if (audience !== undefined && audience !== 'ALL' && audience !== 'PREMIUM_ONLY') {
      res.status(400).json({ success: false, message: 'audience must be ALL or PREMIUM_ONLY' });
      return;
    }

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id as string },
      data: {
        ...(code !== undefined && { code: normalizeCode(code) }),
        ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
        ...(active !== undefined && { active: active === true }),
        ...(usageLimit !== undefined && { usageLimit: usageLimit === '' || usageLimit == null ? null : Number(usageLimit) }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(audience !== undefined && { audience }),
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
    const { code, participantId } = req.body || {};
    let isPremiumCompany = false;
    if (participantId) {
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { company: { select: { status: true } } },
      });
      isPremiumCompany = participant?.company?.status === 'PREMIUM';
    }

    const coupon = await findRedeemableCoupon(code, isPremiumCompany);
    if (!coupon) {
      // Distinguish "exists but restricted" from "doesn't exist at all" —
      // only when the code itself is otherwise valid, so we don't leak
      // whether an unrelated invalid code happens to be premium-only.
      const raw = normalizeCode(code);
      const anyMatch = raw ? await prisma.coupon.findUnique({ where: { code: raw } }) : null;
      if (anyMatch?.audience === 'PREMIUM_ONLY' && !isPremiumCompany) {
        res.status(403).json({ success: false, message: 'This coupon is only valid for ISA Premium member companies' });
        return;
      }
      res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
      return;
    }
    res.json({ success: true, data: { code: coupon.code, discountPercent: coupon.discountPercent } });
  } catch (error) {
    logger.error('Validate coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
});
