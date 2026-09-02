import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';

// Server-owned fee table. Never trust a price from the client — a browser
// can be edited, this file cannot.
const CATEGORY_FEES: Record<string, number> = {
  RUN_3K: 299,
  RUN_5K: 499,
};

export function feeForCategory(category: string): number {
  return CATEGORY_FEES[category] ?? CATEGORY_FEES.RUN_3K!;
}

export const paymentRouter: Router = Router();

// ---- Admin list — every payment across every provider, filterable ----

paymentRouter.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const { status, provider, limit = '100' } = req.query;
      const where: any = {};
      if (status && status !== 'ALL') where.status = status;
      if (provider && provider !== 'ALL') where.provider = provider;

      const payments = await prisma.payment.findMany({
        where,
        include: {
          participant: {
            select: {
              bibNumber: true,
              category: true,
              user: { select: { name: true, email: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit as string, 10) || 100, 500),
      });

      const [total, totalCompleted, totalFailed, totalPending] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'COMPLETED' } }),
        prisma.payment.count({ where: { status: 'FAILED' } }),
        prisma.payment.count({ where: { status: { in: ['PENDING', 'PROCESSING', 'CLAIMED'] } } }),
      ]);

      res.json({
        success: true,
        data: payments,
        summary: { total, completed: totalCompleted, failed: totalFailed, pending: totalPending },
      });
    } catch (error) {
      logger.error('[Payment] list failed:', error);
      res.status(500).json({ success: false, message: 'Failed to load payments' });
    }
  }
);

// ---- Admin manual override — mark a payment COMPLETED/FAILED by hand ----
// Provider-agnostic: usable for any payment row, not tied to one gateway.

paymentRouter.post(
  '/:id/verify',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const payment = await prisma.payment.findUnique({ where: { id: req.params.id as string } });
      if (!payment) {
        res.status(404).json({ success: false, message: 'Payment not found' });
        return;
      }
      if (payment.status === 'COMPLETED') {
        res.json({ success: true, data: { alreadyVerified: true } });
        return;
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });

      const participant = await prisma.participant.update({
        where: { id: payment.participantId },
        data: { paymentStatus: 'COMPLETED', status: 'REGISTERED' },
        include: { user: { select: { name: true, email: true } } },
      });

      sendWelcomeEmail(participant.user.email, participant.user.name, participant.bibNumber, participant.category)
        .catch((e) => logger.error('[Payment] Welcome email failed:', e));

      logger.info(`[Payment] ${payment.reference} verified by ${req.user?.email}`);
      res.json({ success: true });
    } catch (error) {
      logger.error('[Payment] verify (admin) failed:', error);
      res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
  }
);

paymentRouter.post(
  '/:id/reject',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const payment = await prisma.payment.update({
        where: { id: req.params.id as string },
        data: { status: 'FAILED', failureReason: reason || 'Rejected by admin' },
      });
      logger.info(`[Payment] ${payment.reference} rejected by ${req.user?.email}: ${reason || '(no reason given)'}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to reject payment' });
    }
  }
);

// ---- Legacy read (kept for the existing /payments/:registrationId callers) ----

paymentRouter.get('/:registrationId', async (req: Request, res: Response) => {
  try {
    const registrationId = String(req.params.registrationId);
    const payments = await prisma.payment.findMany({
      where: { participantId: registrationId },
      orderBy: { createdAt: 'desc' },
    });
    if (payments.length === 0) {
      res.status(404).json({ success: false, message: 'No payments found for this registration' });
      return;
    }
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment status' });
  }
});
