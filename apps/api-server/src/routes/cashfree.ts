import { Router, Request, Response } from 'express';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { sendWelcomeEmail } from '../services/email.js';
import { feeForCategory } from './payment.js';

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

cashfreeRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { participantId } = req.body;
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

    // Fee is derived server-side from the participant's category — the
    // request body's opinion on the amount is never consulted.
    const amount = feeForCategory(participant.category);

    // A fresh order per attempt, not a reused one — Cashfree order sessions
    // expire, so reusing a stale one just moves the failure to checkout time.
    const payment = await prisma.payment.create({
      data: { participantId, provider: 'CASHFREE', amount, status: 'PENDING' },
    });
    const orderId = `cf${payment.id}`;

    const publicWebUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:3000';
    const webhookUrl = process.env.CASHFREE_WEBHOOK_URL;

    const orderResponse = await cashfree.PGCreateOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: participant.userId,
        customer_email: participant.user.email,
        customer_phone: participant.user.phone,
        customer_name: participant.user.name,
      },
      order_meta: {
        return_url: `${publicWebUrl}/details?cf_order_id=${orderId}`,
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

    const payment = await prisma.payment.findFirst({
      where: { provider: 'CASHFREE', reference: orderId },
      include: { participant: { select: { bibNumber: true } } },
    });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    res.json({
      success: true,
      data: { status: payment.status, bibNumber: payment.participant.bibNumber },
    });
  } catch (error) {
    logger.error('[Payment] cashfree/status failed:', error);
    res.status(500).json({ success: false, message: 'Failed to check payment status' });
  }
});

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
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', paidAt: new Date(), returnParams: event.object as any },
      });

      const participant = await prisma.participant.update({
        where: { id: payment.participantId },
        data: { paymentStatus: 'COMPLETED', status: 'REGISTERED' },
        include: { user: { select: { name: true, email: true } } },
      });

      sendWelcomeEmail(participant.user.email, participant.user.name, participant.bibNumber, participant.category)
        .catch((e) => logger.error('[Payment] Welcome email failed:', e));

      logger.info(`[Payment] Cashfree order ${orderId} completed`);
    } else if (isFailed) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: paymentStatus, returnParams: event.object as any },
      });
      logger.info(`[Payment] Cashfree order ${orderId} failed: ${paymentStatus}`);
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
