import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { getSocketIO } from '../config/socket.js';

export const raceRouter: Router = Router();

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

    const now = new Date();

    const [participants, checkedIn, running, finished] = await Promise.all([
      prisma.participant.count({ where: { eventId: event.id } }),
      prisma.participant.count({ where: { eventId: event.id, checkedIn: true } }),
      prisma.participant.count({ where: { eventId: event.id, status: 'RUNNING' } }),
      prisma.participant.count({
        where: { eventId: event.id, status: { in: ['FINISHED', 'DNF'] } },
      }),
    ]);

    // Calculate current elapsed time from accumulatedElapsedMs
    let elapsedMs = event.accumulatedElapsedMs || 0;
    if (event.status === 'ACTIVE' && event.startedAt) {
      elapsedMs += now.getTime() - new Date(event.startedAt).getTime();
    }

    res.json({
      success: true,
      data: {
        event: { ...event, elapsedMs },
        stats: { participants, checkedIn, running, finished },
      },
    });
  } catch (error) {
    console.error('Race status error:', error);
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
    const now = new Date();

    // Calculate effective start time: now - accumulatedElapsedMs
    const effectiveStartAt = wasPaused && event.accumulatedElapsedMs > 0
      ? new Date(now.getTime() - event.accumulatedElapsedMs)
      : now;

    const [updated] = await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { 
          status: 'ACTIVE',
          ...(!wasPaused && { startedAt: now, accumulatedElapsedMs: 0 }),
          ...(wasPaused && { startedAt: effectiveStartAt }),
        },
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
          startedAt: now,
        },
      }),
    ]);

    try {
      const io = getSocketIO();
      io.to(`event:${eventId}`).emit('race:status', { status: 'ACTIVE', eventId, message: wasPaused ? 'Race resumed' : 'Race started', elapsedMs: event.accumulatedElapsedMs });
      io.to(`tracking:${eventId}`).emit('race:status', { status: 'ACTIVE', eventId, message: wasPaused ? 'Race resumed' : 'Race started', elapsedMs: event.accumulatedElapsedMs });
      io.to(`leaderboard:${eventId}`).emit('race:status', { status: 'ACTIVE', eventId, message: wasPaused ? 'Race resumed' : 'Race started', elapsedMs: event.accumulatedElapsedMs });
    } catch {}

    res.json({ success: true, data: { event: updated, message: wasPaused ? 'Race resumed' : 'Race started', elapsedMs: event.accumulatedElapsedMs } });
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

    const eventStartedAt = event.startedAt;
    const now = new Date();
    const currentRunMs = eventStartedAt ? now.getTime() - new Date(eventStartedAt).getTime() : 0;
    const newAccumulatedElapsedMs = event.accumulatedElapsedMs + currentRunMs;

    const [updated] = await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { 
          status: 'PAUSED',
          accumulatedElapsedMs: newAccumulatedElapsedMs,
        },
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

    try {
      const io = getSocketIO();
      io.to(`event:${eventId}`).emit('race:status', { status: 'PAUSED', eventId, message: 'Race paused', elapsedMs: newAccumulatedElapsedMs });
      io.to(`tracking:${eventId}`).emit('race:status', { status: 'PAUSED', eventId, message: 'Race paused', elapsedMs: newAccumulatedElapsedMs });
      io.to(`leaderboard:${eventId}`).emit('race:status', { status: 'PAUSED', eventId, message: 'Race paused', elapsedMs: newAccumulatedElapsedMs });
    } catch {}

    res.json({ success: true, data: { event: updated, message: 'Race paused', elapsedMs: newAccumulatedElapsedMs } });
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

    // Calculate final elapsed time
    const now = new Date();
    const currentRunMs = event.status === 'ACTIVE' && event.startedAt
      ? now.getTime() - new Date(event.startedAt).getTime()
      : 0;
    const finalAccumulatedElapsedMs = event.accumulatedElapsedMs + currentRunMs;

    const [updated] = await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { 
          status: 'COMPLETED',
          accumulatedElapsedMs: finalAccumulatedElapsedMs,
        },
      }),
      prisma.raceDistance.updateMany({
        where: { eventId },
        data: { status: 'COMPLETED' },
      }),
      prisma.participant.updateMany({
        where: { eventId, status: { in: ['RUNNING', 'PAUSED'] } },
        data: {
          status: 'FINISHED',
          finishedAt: now,
        },
      }),
    ]);

    try {
      const io = getSocketIO();
      io.to(`event:${eventId}`).emit('race:status', { status: 'COMPLETED', eventId, message: 'Race ended', elapsedMs: finalAccumulatedElapsedMs });
      io.to(`tracking:${eventId}`).emit('race:status', { status: 'COMPLETED', eventId, message: 'Race ended', elapsedMs: finalAccumulatedElapsedMs });
      io.to(`leaderboard:${eventId}`).emit('race:status', { status: 'COMPLETED', eventId, message: 'Race ended', elapsedMs: finalAccumulatedElapsedMs });
    } catch {}

    res.json({ success: true, data: { event: updated, message: 'Race ended', elapsedMs: finalAccumulatedElapsedMs } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to end race' });
  }
});