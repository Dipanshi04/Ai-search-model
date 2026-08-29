import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// Server-owned fee table. Never trust a price from the client — a browser
// can be edited, this file cannot.
const CATEGORY_FEES: Record<string, number> = {
  RUN_3K: 299,
  RUN_5K: 499,
};

function feeForCategory(category: string): number {
  return CATEGORY_FEES[category] ?? CATEGORY_FEES.RUN_3K!;
}

export const paymentRouter: Router = Router();

paymentRouter.get('/config', async (_req: Request, res: Response) => {
  res.json({ success: true, data: { keyId: process.env.RAZORPAY_KEY_ID } });
});

// ============================================================================
// Razorpay (currently dormant while ISA's NGO KYC is pending — kept working
// and fixed so switching back later is a config change, not a rewrite).
// ============================================================================

paymentRouter.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.body;
    if (!registrationId) {
      res.status(400).json({ success: false, message: 'registrationId required' });
      return;
    }

    const participant = await prisma.participant.findUnique({ where: { id: registrationId } });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }

    // Fee is derived server-side from the participant's category — the
    // request body's opinion on the amount is not consulted.
    const amount = feeForCategory(participant.category);

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${registrationId}`,
      notes: { participantId: registrationId },
    });

    const payment = await prisma.payment.create({
      data: {
        participantId: registrationId,
        provider: 'RAZORPAY',
        razorpayOrderId: razorpayOrder.id,
        amount,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    logger.error('[Payment] create-order failed:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

paymentRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({ success: false, message: 'Missing payment verification fields' });
      return;
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      logger.error('[Payment] RAZORPAY_KEY_SECRET not configured — refusing to verify');
      res.status(500).json({ success: false, message: 'Payment verification not configured' });
      return;
    }

    // The only thing that actually proves this payment came from Razorpay:
    // recompute the HMAC ourselves and compare, timing-safe.
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const provided = Buffer.from(String(razorpaySignature), 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    const signatureValid =
      provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

    if (!signatureValid) {
      logger.warn(`[Payment] Signature mismatch for order ${razorpayOrderId}`);
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
      return;
    }

    const payment = await prisma.payment.findFirst({ where: { razorpayOrderId } });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayPaymentId, razorpaySignature, status: 'COMPLETED', paidAt: new Date() },
    });

    const participant = await prisma.participant.update({
      where: { id: payment.participantId },
      data: { paymentStatus: 'COMPLETED', status: 'REGISTERED' },
      include: { user: { select: { name: true, email: true } } },
    });

    sendWelcomeEmail(participant.user.email, participant.user.name, participant.bibNumber, participant.category)
      .catch((e) => logger.error('[Payment] Welcome email failed:', e));

    res.json({ success: true, data: { verified: true } });
  } catch (error) {
    logger.error('[Payment] verify failed:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

paymentRouter.post('/failure', async (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, failureReason } = req.body;
    if (razorpayOrderId) {
      await prisma.payment.updateMany({
        where: { razorpayOrderId },
        data: { status: 'FAILED', failureReason },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record payment failure' });
  }
});

// ============================================================================
// ShowtimeBro — redirect-out checkout with no signed webhook. The provider
// only gives us back whatever query params ride along on the return trip,
// and those are trivially forgeable (anyone can type the return URL by
// hand). So this integration never lets a redirect alone mark someone paid:
// it moves PENDING -> CLAIMED, and only an admin comparing the claim queue
// against ShowtimeBro's own sales report can move CLAIMED -> COMPLETED.
// ============================================================================

paymentRouter.post('/showtimebro/start', async (req: Request, res: Response) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      res.status(400).json({ success: false, message: 'participantId required' });
      return;
    }

    const checkoutUrl = process.env.SHOWTIMEBRO_CHECKOUT_URL;
    if (!checkoutUrl) {
      logger.error('[Payment] SHOWTIMEBRO_CHECKOUT_URL not configured');
      res.status(500).json({ success: false, message: 'Payment is not configured yet. Please try again shortly.' });
      return;
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }
    if (participant.paymentStatus === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'This registration is already paid.' });
      return;
    }

    const amount = feeForCategory(participant.category);

    // Reuse an in-flight attempt instead of minting a new reference every
    // time someone clicks Pay (double-click, back button, retry after a
    // dropped connection) — keeps the reconciliation queue to one row per
    // real attempt.
    let payment = await prisma.payment.findFirst({
      where: { participantId, provider: 'SHOWTIMEBRO', status: { in: ['PENDING', 'CLAIMED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      const reference = `stb_${crypto.randomBytes(12).toString('hex')}`;
      payment = await prisma.payment.create({
        data: { participantId, provider: 'SHOWTIMEBRO', reference, amount, status: 'PENDING' },
      });
    }

    // Best-effort: append our reference so it *might* survive the round
    // trip if ShowtimeBro echoes unknown params back. Nothing downstream
    // relies on that happening — the browser also carries the reference
    // itself (see /details), which is what actually correlates the claim.
    const redirectUrl = new URL(checkoutUrl);
    redirectUrl.searchParams.set('ref', payment.reference!);

    res.json({
      success: true,
      data: { reference: payment.reference, amount, redirectUrl: redirectUrl.toString() },
    });
  } catch (error) {
    logger.error('[Payment] showtimebro/start failed:', error);
    res.status(500).json({ success: false, message: 'Failed to start payment' });
  }
});

paymentRouter.post('/showtimebro/claim', async (req: Request, res: Response) => {
  try {
    const { reference, returnParams } = req.body;
    if (!reference) {
      res.status(400).json({ success: false, message: 'reference required' });
      return;
    }

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment || payment.provider !== 'SHOWTIMEBRO') {
      res.status(404).json({ success: false, message: 'Payment session not found' });
      return;
    }

    if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
      res.json({ success: true, data: { status: payment.status } });
      return;
    }

    // Always CLAIMED, never COMPLETED — see the note above the route block.
    // returnParams is recorded purely so an admin has something to eyeball
    // next to the sales report; it never decides status here.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CLAIMED', returnParams: returnParams ?? undefined },
    });

    res.json({ success: true, data: { status: 'CLAIMED' } });
  } catch (error) {
    logger.error('[Payment] showtimebro/claim failed:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment claim' });
  }
});

// Status poll for the /details waiting screen.
paymentRouter.get('/showtimebro/status', async (req: Request, res: Response) => {
  try {
    const reference = String(req.query.reference || '');
    if (!reference) {
      res.status(400).json({ success: false, message: 'reference required' });
      return;
    }
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { participant: { select: { bibNumber: true } } },
    });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment session not found' });
      return;
    }
    res.json({
      success: true,
      data: { status: payment.status, bibNumber: payment.participant.bibNumber },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check payment status' });
  }
});

// ---- Admin reconciliation queue ----

paymentRouter.get(
  '/showtimebro/pending',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (_req: Request, res: Response) => {
    try {
      const payments = await prisma.payment.findMany({
        where: { provider: 'SHOWTIMEBRO', status: { in: ['PENDING', 'CLAIMED'] } },
        include: {
          participant: {
            select: {
              bibNumber: true,
              category: true,
              user: { select: { name: true, email: true, phone: true } },
            },
          },
        },
        orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
      });
      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to load pending payments' });
    }
  }
);

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
        data: { status: 'FAILED', failureReason: reason || 'Not found in ShowtimeBro sales report' },
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
