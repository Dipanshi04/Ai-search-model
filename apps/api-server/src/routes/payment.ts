import { Router, Request, Response } from 'express';
import Razorpay from 'razorpay';
import { prisma } from '../config/database.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export const paymentRouter: Router = Router();

paymentRouter.get('/config', async (_req: Request, res: Response) => {
  res.json({ success: true, data: { keyId: process.env.RAZORPAY_KEY_ID } });
});

paymentRouter.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { registrationId, amount } = req.body;
    if (!registrationId || !amount) {
      res.status(400).json({ success: false, message: 'registrationId and amount required' });
      return;
    }

    const participant = await prisma.participant.findUnique({
      where: { id: registrationId },
      include: { payments: true },
    });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${registrationId}`,
      notes: { participantId: registrationId },
    });

    const razorpayOrderId = razorpayOrder.id;

    const payment = await prisma.payment.create({
      data: {
        participantId: registrationId,
        razorpayOrderId,
        amount,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      data: {
        orderId: razorpayOrderId,
        amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment.id,
      },
    });
  } catch (error) {
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

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
    });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    await prisma.participant.update({
      where: { id: payment.participantId },
      data: {
        paymentStatus: 'COMPLETED',
        status: 'REGISTERED',
      },
    });

    res.json({ success: true, data: { verified: true } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

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