import { Router } from 'express';
import { prisma } from '../config/database.js';

export const checkinRouter = Router();

checkinRouter.get('/stats', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

    let event = undefined;
    if (!eventId) {
      event = await prisma.event.findFirst({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        orderBy: { updatedAt: 'desc' },
      });
      if (!event) {
        event = await prisma.event.findFirst({
          where: { status: 'UPCOMING' },
          orderBy: { date: 'asc' },
        });
      }
    }

    const targetEventId = eventId ?? event?.id;
    if (!targetEventId) {
      res.json({ success: true, data: { total: 0, checkedIn: 0, percentage: 0 } });
      return;
    }

    const [total, checkedIn] = await Promise.all([
      prisma.participant.count({ where: { eventId: targetEventId } }),
      prisma.participant.count({ where: { eventId: targetEventId, checkedIn: true } }),
    ]);

    const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    res.json({ success: true, data: { total, checkedIn, percentage } });
  } catch (error) {
    console.error('Checkin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch checkin stats' });
  }
});

checkinRouter.post('/scan', async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) {
      res.status(400).json({ success: false, message: 'qrData required' });
      return;
    }

    const participant = await prisma.participant.findUnique({
      where: { bibNumber: qrData },
      include: { user: true, company: true },
    });

    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }

    if (participant.checkedIn) {
      res.status(400).json({ success: false, message: 'Participant already checked in', participant });
      return;
    }

    const updated = await prisma.participant.update({
      where: { id: participant.id },
      data: { checkedIn: true, checkedInAt: new Date(), status: 'CHECKED_IN' },
      include: { user: true, company: true },
    });

    res.json({ success: true, data: { participant: updated }, message: 'Check-in successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to scan check-in' });
  }
});

checkinRouter.post('/undo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await prisma.participant.findUnique({ where: { id } });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }

    const updated = await prisma.participant.update({
      where: { id },
      data: { checkedIn: false, checkedInAt: null, status: 'REGISTERED' },
      include: { user: true, company: true },
    });

    res.json({ success: true, data: { participant: updated }, message: 'Check-in undone' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to undo check-in' });
  }
});