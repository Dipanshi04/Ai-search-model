import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

export const raceRouter = Router();

raceRouter.get('/events', async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        _count: { select: { participants: true } },
        raceDistances: {
          orderBy: { distanceKm: 'asc' },
          include: { _count: { select: { routePoints: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch race events' });
  }
});

raceRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

    let event;
    if (eventId) {
      event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { raceDistances: { orderBy: { distanceKm: 'asc' } } },
      });
    } else {
      event = await prisma.event.findFirst({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        include: { raceDistances: { orderBy: { distanceKm: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
      });
      if (!event) {
        event = await prisma.event.findFirst({
          where: { status: 'UPCOMING' },
          include: { raceDistances: { orderBy: { distanceKm: 'asc' } } },
          orderBy: { date: 'asc' },
        });
      }
    }

    if (!event) {
      res.json({ success: true, data: { event: null, stats: null } });
      return;
    }

    const [participants, checkedIn, running, finished] = await Promise.all([
      prisma.participant.count({ where: { eventId: event.id } }),
      prisma.participant.count({ where: { eventId: event.id, checkedIn: true } }),
      prisma.participant.count({ where: { eventId: event.id, status: 'RUNNING' } }),
      prisma.participant.count({
        where: { eventId: event.id, status: { in: ['FINISHED', 'DNF'] } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        event,
        stats: { participants, checkedIn, running, finished },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch race status' });
  }
});

raceRouter.post('/start', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Race already completed' });
      return;
    }

    const wasPaused = event.status === 'PAUSED';

    const [updated] = await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { status: 'ACTIVE' },
      }),
      prisma.raceDistance.updateMany({
        where: { eventId },
        data: { status: 'STARTED' },
      }),
      prisma.participant.updateMany({
        where: {
          eventId,
          status: wasPaused ? 'PAUSED' : 'CHECKED_IN',
        },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      }),
    ]);

    res.json({ success: true, data: { event: updated, message: wasPaused ? 'Race resumed' : 'Race started' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start race' });
  }
});

raceRouter.post('/pause', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.status !== 'ACTIVE') {
      res.status(400).json({ success: false, message: 'Race is not active' });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { status: 'PAUSED' },
      }),
      prisma.raceDistance.updateMany({
        where: { eventId },
        data: { status: 'PAUSED' },
      }),
      prisma.participant.updateMany({
        where: { eventId, status: 'RUNNING' },
        data: { status: 'PAUSED' },
      }),
    ]);

    res.json({ success: true, data: { event: updated, message: 'Race paused' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to pause race' });
  }
});

raceRouter.post('/end', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Race already completed' });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { status: 'COMPLETED' },
      }),
      prisma.raceDistance.updateMany({
        where: { eventId },
        data: { status: 'COMPLETED' },
      }),
      prisma.participant.updateMany({
        where: { eventId, status: { in: ['RUNNING', 'PAUSED'] } },
        data: {
          status: 'FINISHED',
          finishedAt: new Date(),
        },
      }),
    ]);

    res.json({ success: true, data: { event: updated, message: 'Race ended' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to end race' });
  }
});