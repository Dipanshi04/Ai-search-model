import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// Shared by the single-payment admin actions below and by the CSV
// reconciliation endpoint (routes/payment-reconcile.ts) — one place that
// knows what "marking a payment paid/failed by hand" actually does, so a
// reconciled-from-CSV payment behaves identically to one clicked in the UI
// (welcome email, closing out stray PENDING siblings, etc).
export async function verifyPaymentById(paymentId: string, paidAt?: Date): Promise<{ alreadyVerified?: boolean }> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error('Payment not found');
  if (payment.status === 'COMPLETED') return { alreadyVerified: true };

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'COMPLETED', paidAt: paidAt || new Date() },
  });

  const participant = await prisma.participant.update({
    where: { id: payment.participantId },
    data: { paymentStatus: 'COMPLETED', status: 'REGISTERED' },
    include: { user: { select: { name: true, email: true } } },
  });

  sendWelcomeEmail(participant.user.email, participant.user.name, participant.bibNumber, participant.category)
    .catch((e) => logger.error('[Payment] Welcome email failed:', e));

  prisma.payment.updateMany({
    where: { participantId: payment.participantId, status: 'PENDING', id: { not: payment.id } },
    data: { status: 'FAILED', failureReason: 'Superseded by a completed payment' },
  }).catch((e) => logger.error('[Payment] Failed to close out superseded pending payments:', e));

  return {};
}

export async function rejectPaymentById(paymentId: string, reason?: string): Promise<void> {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'FAILED', failureReason: reason || 'Rejected by admin' },
  });
}

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

      const result = await verifyPaymentById(payment.id);
      if (result.alreadyVerified) {
        res.json({ success: true, data: { alreadyVerified: true } });
        return;
      }

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
      await rejectPaymentById(req.params.id as string, reason);
      logger.info(`[Payment] ${req.params.id} rejected by ${req.user?.email}: ${reason || '(no reason given)'}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to reject payment' });
    }
  }
);

// ---- Cashfree CSV reconciliation ----
// Cashfree's own webhook normally keeps payments in sync automatically, but
// a missed/failed webhook delivery can leave a payment stuck PENDING even
// though Cashfree's own records show it succeeded or failed. Admin downloads
// the settlement/transaction CSV from the Cashfree dashboard and uploads it
// here to catch and fix those stragglers — preview first, apply only what's
// selected, never silently auto-applied.

interface ReconcileEntry {
  orderId: string;
  cashfreeOrderId: string | null;
  csvStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  csvAmount: number | null;
  transactionTime: string | null;
  csvFailureReason: string | null;
  paymentId: string | null;
  dbStatus: string | null;
  participant: { name: string; email: string; bibNumber: string } | null;
  proposedAction: 'MARK_PAID' | 'MARK_FAILED' | null;
  note: string;
  conflict: boolean;
}

type CsvOutcome = { status: 'SUCCESS' | 'FAILED' | 'CANCELLED'; amount: number | null; time: string | null; reason: string | null; cashfreeOrderId: string | null };

function parseReconcileCsv(buffer: Buffer): Map<string, CsvOutcome> {
  const csvString = buffer.toString('utf-8');
  const records: Record<string, string>[] = parse(csvString, { columns: true, skip_empty_lines: true, trim: true });

  // Multiple rows can share one Order Id — a runner who retried after a
  // dropped/failed attempt before succeeding. SUCCESS always wins as the
  // order's real outcome; FAILED wins over a plain USER_DROPPED (a dropped
  // attempt means the user simply cancelled, not a technical failure — see
  // the CANCELLED branch below).
  const byOrder = new Map<string, CsvOutcome>();

  for (const row of records) {
    const orderId = row['Order Id']?.trim();
    const status = row['Transaction Status']?.trim().toUpperCase();
    if (!orderId || !status) continue;

    const existing = byOrder.get(orderId);
    if (existing?.status === 'SUCCESS') continue; // already resolved for this order
    const cashfreeOrderId = row['Cashfree Order ID']?.trim() || existing?.cashfreeOrderId || null;

    if (status === 'SUCCESS') {
      byOrder.set(orderId, {
        status: 'SUCCESS',
        amount: row['Transaction Amount'] ? Number(row['Transaction Amount']) : null,
        // Cashfree exports "YYYY-MM-DD HH:mm:ss" in IST with no timezone
        // marker — explicitly anchored to +05:30 here (rather than letting
        // `new Date` assume the server's own timezone, which is UTC in
        // production and would silently shift every paidAt by 5.5 hours).
        time: row['Transaction Time'] ? new Date(`${row['Transaction Time'].replace(' ', 'T')}+05:30`).toISOString() : null,
        reason: null,
        cashfreeOrderId,
      });
    } else if (status === 'FAILED') {
      if (existing?.status !== 'FAILED') {
        byOrder.set(orderId, { status: 'FAILED', amount: null, time: null, reason: row['Failure Reason'] || 'Payment failed', cashfreeOrderId });
      }
    } else if (status === 'USER_DROPPED' && !existing) {
      byOrder.set(orderId, { status: 'CANCELLED', amount: null, time: null, reason: 'Cancelled — user did not complete the payment', cashfreeOrderId });
    }
  }

  return byOrder;
}

async function buildReconcileReport(buffer: Buffer): Promise<ReconcileEntry[]> {
  const byOrder = parseReconcileCsv(buffer);

  const references = Array.from(byOrder.keys());
  const payments = await prisma.payment.findMany({
    where: { reference: { in: references } },
    include: { participant: { select: { bibNumber: true, user: { select: { name: true, email: true } } } } },
  });
  const byReference = new Map(payments.map((p) => [p.reference as string, p]));

  const report: ReconcileEntry[] = [];
  for (const [orderId, csv] of byOrder) {
    const payment = byReference.get(orderId);
    const participant = payment
      ? { name: payment.participant.user.name, email: payment.participant.user.email, bibNumber: payment.participant.bibNumber }
      : null;

    let proposedAction: ReconcileEntry['proposedAction'] = null;
    let note: string;
    let conflict = false;

    if (!payment) {
      note = 'No matching payment found for this order id';
    } else if (payment.status === 'COMPLETED') {
      if (csv.status === 'SUCCESS') {
        note = 'Already reconciled — no action needed';
      } else {
        note = `DB shows COMPLETED but Cashfree shows ${csv.status} — review before touching this one`;
        conflict = true;
      }
    } else if (payment.status === 'FAILED') {
      if (csv.status !== 'SUCCESS') {
        note = 'Already reconciled — no action needed';
      } else {
        note = 'DB shows FAILED but Cashfree shows SUCCESS — payment actually went through';
        proposedAction = 'MARK_PAID';
        conflict = true;
      }
    } else {
      // PENDING / PROCESSING / CLAIMED — the normal case a missed webhook leaves behind
      if (csv.status === 'SUCCESS') {
        proposedAction = 'MARK_PAID';
        note = 'Cashfree confirms payment succeeded — webhook likely missed';
      } else if (csv.status === 'FAILED') {
        proposedAction = 'MARK_FAILED';
        note = 'Cashfree confirms payment failed';
      } else {
        proposedAction = 'MARK_FAILED';
        note = 'User cancelled the payment (dropped before completing) — not a technical failure';
      }
    }

    report.push({
      orderId,
      cashfreeOrderId: csv.cashfreeOrderId,
      csvStatus: csv.status,
      csvAmount: csv.amount,
      transactionTime: csv.time,
      csvFailureReason: csv.reason,
      paymentId: payment?.id || null,
      dbStatus: payment?.status || null,
      participant,
      proposedAction,
      note,
      conflict,
    });
  }

  // Actionable and conflicting rows first — an admin skimming this wants to
  // see what needs a decision before the long tail of already-reconciled rows.
  report.sort((a, b) => {
    const score = (r: ReconcileEntry) => (r.conflict ? 0 : r.proposedAction ? 1 : 2);
    return score(a) - score(b);
  });

  return report;
}

paymentRouter.post(
  '/reconcile/preview',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  csvUpload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No CSV file uploaded' });
        return;
      }
      const report = await buildReconcileReport(req.file.buffer);
      res.json({
        success: true,
        data: {
          entries: report,
          summary: {
            total: report.length,
            actionable: report.filter((r) => r.proposedAction).length,
            conflicts: report.filter((r) => r.conflict).length,
            unmatched: report.filter((r) => !r.paymentId).length,
          },
        },
      });
    } catch (error) {
      logger.error('[Payment] reconcile preview failed:', error);
      res.status(400).json({ success: false, message: 'Could not parse this CSV. Check it\'s the Cashfree transactions export.' });
    }
  }
);

paymentRouter.post(
  '/reconcile/apply',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const { updates } = req.body as {
        updates: { paymentId: string; action: 'MARK_PAID' | 'MARK_FAILED'; reason?: string; paidAt?: string }[];
      };
      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ success: false, message: 'No updates provided' });
        return;
      }

      const results: { paymentId: string; success: boolean; error?: string }[] = [];
      for (const u of updates) {
        try {
          if (u.action === 'MARK_PAID') {
            await verifyPaymentById(u.paymentId, u.paidAt ? new Date(u.paidAt) : undefined);
          } else {
            await rejectPaymentById(u.paymentId, u.reason);
          }
          results.push({ paymentId: u.paymentId, success: true });
        } catch (err: any) {
          results.push({ paymentId: u.paymentId, success: false, error: err.message || 'Failed' });
        }
      }

      logger.info(`[Payment] Reconciliation applied by ${req.user?.email}: ${results.filter((r) => r.success).length}/${results.length} updated`);
      res.json({ success: true, data: { results } });
    } catch (error) {
      logger.error('[Payment] reconcile apply failed:', error);
      res.status(500).json({ success: false, message: 'Failed to apply updates' });
    }
  }
);

// ---- Recheck & clean up stray PENDING payments ----
// A participant can end up with several PENDING Payment rows from repeated
// checkout attempts (see verifyPaymentById above — each attempt gets a
// fresh order). Normally the row that actually completes closes out its
// siblings automatically, but if the participant got marked paid some other
// way (webhook landed on an attempt that then got manually corrected,
// reconciled from CSV against a different row, etc.) the other PENDING
// rows are never revisited by anything. This looks a participant up by BIB
// or email and, if they're already paid, closes out whatever's left stuck
// PENDING under them. With neither BIB nor email given, it sweeps every
// participant in this state at once.
paymentRouter.post(
  '/recheck',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const { bibNumber, email } = req.body as { bibNumber?: string; email?: string };

      let participantIds: string[] | undefined;
      let matchedParticipant: { name: string; bibNumber: string } | null = null;

      if (bibNumber || email) {
        const participant = await prisma.participant.findFirst({
          where: bibNumber
            ? { bibNumber: bibNumber.trim() }
            : { user: { email: email!.trim().toLowerCase() } },
          include: { user: { select: { name: true } } },
        });
        if (!participant) {
          res.status(404).json({ success: false, message: 'No participant found for that BIB number or email' });
          return;
        }
        if (participant.paymentStatus !== 'COMPLETED') {
          res.json({
            success: true,
            data: {
              participant: { name: participant.user.name, bibNumber: participant.bibNumber },
              closed: 0,
              message: `${participant.user.name} (#${participant.bibNumber}) isn't marked paid yet — nothing to clean up. Use "Mark Paid" or the CSV reconcile tab if Cashfree shows they actually paid.`,
            },
          });
          return;
        }
        participantIds = [participant.id];
        matchedParticipant = { name: participant.user.name, bibNumber: participant.bibNumber };
      } else {
        const alreadyPaid = await prisma.participant.findMany({
          where: { paymentStatus: 'COMPLETED' },
          select: { id: true },
        });
        participantIds = alreadyPaid.map((p) => p.id);
      }

      const stray = await prisma.payment.updateMany({
        where: {
          participantId: { in: participantIds },
          status: { in: ['PENDING', 'PROCESSING', 'CLAIMED'] },
        },
        data: { status: 'FAILED', failureReason: 'Superseded — participant already paid (cleaned up by recheck)' },
      });

      logger.info(`[Payment] Recheck by ${req.user?.email}: closed ${stray.count} stray pending payment(s)${matchedParticipant ? ` for ${matchedParticipant.bibNumber}` : ' (global sweep)'}`);

      res.json({
        success: true,
        data: {
          participant: matchedParticipant,
          closed: stray.count,
          message: matchedParticipant
            ? `Closed out ${stray.count} stray pending payment${stray.count !== 1 ? 's' : ''} for ${matchedParticipant.name} (#${matchedParticipant.bibNumber}).`
            : `Swept all paid participants — closed out ${stray.count} stray pending payment${stray.count !== 1 ? 's' : ''}.`,
        },
      });
    } catch (error) {
      logger.error('[Payment] recheck failed:', error);
      res.status(500).json({ success: false, message: 'Failed to recheck payments' });
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
