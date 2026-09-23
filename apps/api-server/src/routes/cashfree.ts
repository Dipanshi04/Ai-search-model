import { Router, Request, Response } from 'express';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { sendWelcomeEmail } from '../services/email.js';
import { feeForCategory } from './payment.js';
import { findRedeemableCoupon } from './coupons.js';
import { authenticate, requireRole } from '../middleware/auth.js';

// ============================================================================
// Cashfree — the main, active payment gateway. Has a real signed webhook,
// so a payment can move straight to COMPLETED automatically once the
// signature checks out — no admin reconciliation step needed.
// ============================================================================

function getCashfreeClient(): Cashfree | null {
  const clientId = process.env.CASHFREE_CLIENT_ID?.trim();
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const env = process.env.CASHFREE_ENV === 'PRODUCTION' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  return new Cashfree(env, clientId, clientSecret);
}

export const cashfreeRouter: Router = Router();

type CashfreeReconcileOutcome = 'COMPLETED' | 'FAILED' | 'PENDING' | 'UNCHANGED';

interface CashfreeReconcileResult {
  paymentId: string;
  orderId: string | null;
  orderStatus?: string;
  outcome: CashfreeReconcileOutcome;
  reason?: string;
}

type CashfreeReconcileItem = CashfreeReconcileResult & { error?: string };

async function completeCashfreePayment(
  paymentId: string,
  gatewaySnapshot: unknown,
  paidAt = new Date(),
): Promise<boolean> {
  const participant = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status !== 'PENDING') return null;

    // The conditional update makes webhook delivery and API reconciliation
    // safe to race: only one of them can perform completion side effects.
    const transitioned = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        paidAt,
        returnParams: gatewaySnapshot as any,
      },
    });
    if (transitioned.count === 0) return null;

    const updatedParticipant = await tx.participant.update({
      where: { id: payment.participantId },
      data: { paymentStatus: 'COMPLETED', status: 'REGISTERED' },
      include: { user: { select: { name: true, email: true } } },
    });

    if (payment.couponCode) {
      await tx.coupon.updateMany({
        where: { code: payment.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.payment.updateMany({
      where: { participantId: payment.participantId, status: 'PENDING', id: { not: payment.id } },
      data: { status: 'FAILED', failureReason: 'Superseded by a completed payment' },
    });

    return updatedParticipant;
  });

  if (!participant) return false;

  sendWelcomeEmail(participant.user.email, participant.name || participant.user.name, participant.bibNumber, participant.category)
    .catch((error) => logger.error('[Payment] Welcome email failed:', error));
  return true;
}

async function failCashfreePayment(paymentId: string, reason: string, gatewaySnapshot: unknown): Promise<boolean> {
  const transitioned = await prisma.payment.updateMany({
    where: { id: paymentId, status: 'PENDING' },
    data: { status: 'FAILED', failureReason: reason, returnParams: gatewaySnapshot as any },
  });
  return transitioned.count > 0;
}

async function reconcileCashfreePayment(paymentId: string, cashfree: Cashfree): Promise<CashfreeReconcileResult> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== 'CASHFREE') {
    return { paymentId, orderId: payment?.reference || null, outcome: 'UNCHANGED', reason: 'Cashfree payment not found' };
  }
  if (payment.status !== 'PENDING' || !payment.reference) {
    return { paymentId, orderId: payment.reference, outcome: 'UNCHANGED', reason: `Already ${payment.status}` };
  }

  const orderResponse = await cashfree.PGFetchOrder(payment.reference);
  const order = orderResponse.data;
  const orderStatus = String(order.order_status || '').toUpperCase();

  if (orderStatus === 'PAID') {
    // Payment details provide the most accurate completion time, but the
    // order's PAID status remains sufficient if that secondary lookup fails.
    let gatewayPayments: unknown[] = [];
    let paidAt = new Date();
    try {
      const paymentsResponse = await cashfree.PGOrderFetchPayments(payment.reference);
      gatewayPayments = paymentsResponse.data;
      const successful = paymentsResponse.data.find((entry) => entry.payment_status === 'SUCCESS');
      if (successful?.payment_completion_time) {
        const completionTime = new Date(successful.payment_completion_time);
        if (!Number.isNaN(completionTime.getTime())) paidAt = completionTime;
      }
    } catch (error) {
      logger.warn(`[Payment] Could not fetch transaction details for paid Cashfree order ${payment.reference}; using order status`, error);
    }

    const changed = await completeCashfreePayment(
      payment.id,
      { source: 'cashfree_api_reconciliation', order, payments: gatewayPayments },
      paidAt,
    );
    return {
      paymentId,
      orderId: payment.reference,
      orderStatus,
      outcome: changed ? 'COMPLETED' : 'UNCHANGED',
      reason: changed ? undefined : 'Payment was reconciled concurrently',
    };
  }

  if (orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
    const reason = `Cashfree order ${orderStatus.toLowerCase()}`;
    const changed = await failCashfreePayment(
      payment.id,
      reason,
      { source: 'cashfree_api_reconciliation', order },
    );
    return {
      paymentId,
      orderId: payment.reference,
      orderStatus,
      outcome: changed ? 'FAILED' : 'UNCHANGED',
      reason: changed ? reason : 'Payment was reconciled concurrently',
    };
  }

  return { paymentId, orderId: payment.reference, orderStatus, outcome: 'PENDING' };
}

async function reconcileStaleCashfreePayments(limit = 50): Promise<CashfreeReconcileItem[] | null> {
  const cashfree = getCashfreeClient();
  if (!cashfree) return null;

  const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
  const pending = await prisma.payment.findMany({
    where: {
      provider: 'CASHFREE',
      status: 'PENDING',
      reference: { not: null },
      createdAt: { lte: staleBefore },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, reference: true },
  });

  const results: CashfreeReconcileItem[] = [];
  for (const item of pending) {
    try {
      results.push(await reconcileCashfreePayment(item.id, cashfree));
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Cashfree reconciliation failed';
      logger.warn(`[Payment] Cashfree reconciliation failed for ${item.reference}:`, error?.response?.data || error);
      results.push({ paymentId: item.id, orderId: item.reference, outcome: 'UNCHANGED', error: message });
    }
  }
  return results;
}

function summarizeReconciliation(results: CashfreeReconcileItem[]) {
  return {
    checked: results.length,
    completed: results.filter((result) => result.outcome === 'COMPLETED').length,
    failed: results.filter((result) => result.outcome === 'FAILED').length,
    stillPending: results.filter((result) => result.outcome === 'PENDING').length,
    errors: results.filter((result) => result.error).length,
  };
}

let reconciliationTimer: NodeJS.Timeout | null = null;

export function startCashfreeReconciliationJob(): void {
  // Production runs two PM2 cluster workers. Let only worker 0 perform the
  // sweep. Local development must not unexpectedly reconcile a restored
  // production database or send real confirmation emails.
  if (
    process.env.NODE_ENV !== 'production'
    || reconciliationTimer
    || (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0')
  ) return;

  const run = async () => {
    try {
      const results = await reconcileStaleCashfreePayments();
      if (!results) return;
      const summary = summarizeReconciliation(results);
      if (summary.completed || summary.failed || summary.errors) {
        logger.info(`[Payment] Scheduled Cashfree reconciliation: ${JSON.stringify(summary)}`);
      }
    } catch (error) {
      logger.error('[Payment] Scheduled Cashfree reconciliation failed:', error);
    }
  };

  // Give the API time to finish starting, then sweep every five minutes.
  const initialTimer = setTimeout(run, 60_000);
  initialTimer.unref();
  reconciliationTimer = setInterval(run, 5 * 60 * 1000);
  reconciliationTimer.unref();
}

cashfreeRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { participantId, couponCode, returnUrl } = req.body;
    if (!participantId) {
      res.status(400).json({ success: false, message: 'participantId required' });
      return;
    }

    const cashfree = getCashfreeClient();
    if (!cashfree) {
      logger.error('[Payment] Cashfree not configured (CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET missing)');
      res.status(500).json({ success: false, message: 'Payment is not configured yet. Please try again shortly.' });
      return;
    }

    // Before opening another checkout, reconcile earlier attempts for this
    // participant. If one actually succeeded after its webhook was missed,
    // the participant will be loaded as paid below and a duplicate charge is
    // prevented. Active/expired attempts are handled by their order status.
    const earlierPending = await prisma.payment.findMany({
      where: { participantId, provider: 'CASHFREE', status: 'PENDING', reference: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, reference: true },
    });
    for (const earlier of earlierPending) {
      try {
        await reconcileCashfreePayment(earlier.id, cashfree);
      } catch (error: any) {
        // Do not block a legitimate retry because an older order can no
        // longer be fetched. The new attempt still receives its own order.
        logger.warn(`[Payment] Could not reconcile earlier Cashfree order ${earlier.reference}:`, error?.response?.data || error);
      }
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        company: { select: { status: true } },
      },
    });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }
    if (participant.paymentStatus === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'This registration is already paid.' });
      return;
    }

    // Fee is derived server-side from the participant's category — the
    // request body's opinion on the amount is never consulted. Premium
    // companies get 50% off, applied silently here rather than shown
    // anywhere before checkout — the registration form and review screen
    // both display the standard price; only the real Cashfree charge
    // (and Cashfree's own checkout page) reflects the discount.
    //
    // A coupon is a separate, independent discount path — anyone can use
    // one, not just premium companies — entered explicitly by the runner
    // on the payment screen, so showing its effect there (unlike the
    // premium discount) is the whole point. Re-validated here regardless
    // of whatever the client showed, since that's just a preview. Rather
    // than stacking both discounts, the runner gets whichever is bigger —
    // stacking would let a premium-company runner combine two discounts
    // for an effective rate no coupon was actually meant to grant.
    const baseAmount = feeForCategory(participant.category);
    const isPremiumCompany = participant.company?.status === 'PREMIUM';
    let discountPercent = isPremiumCompany ? 50 : 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const coupon = await findRedeemableCoupon(couponCode, isPremiumCompany);
      if (coupon && coupon.discountPercent > discountPercent) {
        discountPercent = coupon.discountPercent;
        appliedCouponCode = coupon.code;
      } else if (coupon) {
        // Valid, but not better than the premium discount already applying
        // — still record it so its usedCount reflects real redemptions.
        appliedCouponCode = coupon.code;
      }
    }
    const amount = Math.round(baseAmount * (1 - discountPercent / 100));

    // A fresh order per attempt, not a reused one — Cashfree order sessions
    // expire, so reusing a stale one just moves the failure to checkout time.
    const payment = await prisma.payment.create({
      data: { participantId, provider: 'CASHFREE', amount, status: 'PENDING', couponCode: appliedCouponCode },
    });
    const orderId = `cf${payment.id}`;

    const publicWebUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:3000';
    const runnerAppUrl = process.env.RUNNER_APP_URL || 'http://localhost:3001';
    const webhookUrl = process.env.CASHFREE_WEBHOOK_URL;

    // Defaults to the public-web payment-confirmation page — but the runner
    // app pays through this same endpoint when a runner logs in with
    // payment still pending, and needs Cashfree to send them back to the
    // runner app itself, not a different app entirely. Only accepted when
    // it actually points at one of our own deployed frontends, so this
    // can't be used as an open redirect.
    let returnBase = `${publicWebUrl}/details`;
    if (typeof returnUrl === 'string' && (returnUrl.startsWith(publicWebUrl) || returnUrl.startsWith(runnerAppUrl))) {
      returnBase = returnUrl;
    }
    const returnSeparator = returnBase.includes('?') ? '&' : '?';
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const orderResponse = await cashfree.PGCreateOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      // Keep abandoned checkout sessions from remaining payable long after
      // the participant has started a newer payment attempt.
      order_expiry_time: expiryTime,
      customer_details: {
        customer_id: participant.userId,
        customer_email: participant.user.email,
        customer_phone: participant.user.phone,
        customer_name: participant.name || participant.user.name,
      },
      order_meta: {
        return_url: `${returnBase}${returnSeparator}cf_order_id=${orderId}`,
        // Only set once a production HTTPS URL is configured — Cashfree
        // can't reach a localhost address, and an unreachable notify_url
        // just means the webhook silently never fires, not an order-create
        // failure, so it's safe to omit while developing.
        ...(webhookUrl ? { notify_url: webhookUrl } : {}),
      },
    });

    const sessionId = orderResponse.data.payment_session_id;
    if (!sessionId) {
      logger.error('[Payment] Cashfree order created without a payment_session_id', orderResponse.data);
      res.status(500).json({ success: false, message: 'Failed to start payment' });
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { reference: orderId, externalRef: orderResponse.data.cf_order_id || null },
    });

    res.json({
      success: true,
      data: { paymentSessionId: sessionId, orderId, amount, environment: process.env.CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox' },
    });
  } catch (error: any) {
    logger.error('[Payment] cashfree/start failed:', error?.response?.data || error);
    res.status(500).json({ success: false, message: 'Failed to start payment' });
  }
});

cashfreeRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId required' });
      return;
    }

    let payment = await prisma.payment.findFirst({
      where: { provider: 'CASHFREE', reference: orderId },
      include: {
        participant: {
          select: {
            bibNumber: true,
            category: true,
            name: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    // The return-page poll doubles as a missed-webhook safety net. Cashfree
    // remains the source of truth; a query-string redirect never decides the
    // result by itself.
    if (payment.status === 'PENDING') {
      const cashfree = getCashfreeClient();
      if (cashfree) {
        try {
          await reconcileCashfreePayment(payment.id, cashfree);
          payment = (await prisma.payment.findFirst({
            where: { id: payment.id },
            include: {
              participant: {
                select: {
                  bibNumber: true,
                  category: true,
                  name: true,
                  user: { select: { name: true, avatarUrl: true } },
                },
              },
            },
          }))!;
        } catch (error: any) {
          // A temporary Cashfree API problem should not turn the status poll
          // itself into an error. Keep reporting PENDING and try again later.
          logger.warn(`[Payment] Cashfree status reconciliation failed for ${orderId}:`, error?.response?.data || error);
        }
      }
    }

    res.json({
      success: true,
      data: {
        status: payment.status,
        bibNumber: payment.participant.bibNumber,
        category: payment.participant.category,
        name: payment.participant.name || payment.participant.user.name,
        avatarUrl: payment.participant.user.avatarUrl,
        amount: payment.amount,
      },
    });
  } catch (error) {
    logger.error('[Payment] cashfree/status failed:', error);
    res.status(500).json({ success: false, message: 'Failed to check payment status' });
  }
});

// Admin/API sweep for abandoned orders whose webhook never provided a final
// state. Cashfree is queried for every stale PENDING row; ACTIVE orders stay
// pending, while PAID/EXPIRED/TERMINATED orders are safely applied locally.
cashfreeRouter.post(
  '/reconcile-pending',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const requestedLimit = Number(req.body?.limit);
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100) : 50;
      const results = await reconcileStaleCashfreePayments(limit);
      if (!results) {
        res.status(500).json({ success: false, message: 'Cashfree is not configured' });
        return;
      }

      const summary = summarizeReconciliation(results);
      logger.info(`[Payment] Cashfree pending reconciliation by ${req.user?.email}: ${JSON.stringify(summary)}`);
      res.json({ success: true, data: { summary, results } });
    } catch (error) {
      logger.error('[Payment] Cashfree pending reconciliation failed:', error);
      res.status(500).json({ success: false, message: 'Failed to reconcile pending Cashfree payments' });
    }
  },
);

// Mounted on express.raw() in index.ts — signature verification needs the
// exact original bytes, not the JSON-parsed-and-reserialized body.
cashfreeRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const cashfree = getCashfreeClient();
    if (!cashfree) {
      logger.error('[Payment] Cashfree webhook received but gateway not configured');
      res.status(500).send('not configured');
      return;
    }

    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const rawBody = (req.body as Buffer).toString('utf8');

    let event;
    try {
      event = cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    } catch (err) {
      logger.warn('[Payment] Cashfree webhook signature verification failed:', err);
      res.status(400).send('invalid signature');
      return;
    }

    const orderId: string | undefined = event.object?.data?.order?.order_id;
    const paymentStatus: string | undefined = event.object?.data?.payment?.payment_status;

    if (!orderId) {
      res.json({ success: true });
      return;
    }

    const payment = await prisma.payment.findFirst({ where: { provider: 'CASHFREE', reference: orderId } });
    if (!payment) {
      logger.warn(`[Payment] Cashfree webhook for unknown order ${orderId}`);
      res.json({ success: true });
      return;
    }

    // Idempotent — Cashfree retries webhooks, and a payment already moved
    // out of PENDING should never be moved again by a redelivered event.
    if (payment.status !== 'PENDING') {
      res.json({ success: true });
      return;
    }

    const isPaid = paymentStatus === 'SUCCESS';
    const isFailed = paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED' || paymentStatus === 'CANCELLED' || paymentStatus === 'VOID';

    if (isPaid) {
      const paymentCompletionTime: string | undefined = event.object?.data?.payment?.payment_completion_time;
      const parsedPaidAt = paymentCompletionTime ? new Date(paymentCompletionTime) : new Date();
      const paidAt = Number.isNaN(parsedPaidAt.getTime()) ? new Date() : parsedPaidAt;
      const changed = await completeCashfreePayment(payment.id, event.object, paidAt);
      if (changed) logger.info(`[Payment] Cashfree order ${orderId} completed`);
    } else if (isFailed) {
      // FAILED/USER_DROPPED describes one transaction attempt, not
      // necessarily the order. The same ACTIVE order can still be retried,
      // so leave it PENDING until API reconciliation sees the order become
      // EXPIRED or TERMINATED (or PAID after a successful retry).
      await prisma.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { returnParams: event.object as any },
      });
      logger.info(`[Payment] Cashfree order ${orderId} attempt ended with ${paymentStatus}; awaiting final order status`);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('[Payment] cashfree/webhook failed:', error);
    // Cashfree retries on non-2xx — respond 200 anyway once we've logged it,
    // since a webhook we can't process won't succeed on retry either and we
    // don't want to be retried indefinitely for the same bad event.
    res.json({ success: false });
  }
});
