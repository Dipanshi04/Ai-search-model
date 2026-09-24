import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { getSocketIO } from '../config/socket.js';
import { calculateCO2FromTrees, recalcTreeCounter } from '../services/greenMission.js';

export const treesRouter: Router = Router();

// Resolves the same way both GET handlers below already do — kept as one
// helper instead of duplicating it a third time for the new PATCH endpoint.
async function resolveEventId(queryEventId?: string): Promise<string | undefined> {
  if (queryEventId) return queryEventId;
  let event = await prisma.event.findFirst({
    where: { status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] } },
    orderBy: { updatedAt: 'desc' },
  });
  if (!event) {
    event = await prisma.event.findFirst({ where: { status: 'UPCOMING' }, orderBy: { date: 'asc' } });
  }
  return event?.id;
}

treesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

    let eventIdToUse = eventId;
    if (!eventIdToUse) {
      let event = await prisma.event.findFirst({
        where: { status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] } },
        orderBy: { updatedAt: 'desc' },
      });
      if (!event) {
        event = await prisma.event.findFirst({
          where: { status: 'UPCOMING' },
          orderBy: { date: 'asc' },
        });
      }
      eventIdToUse = event?.id;
    }

    if (!eventIdToUse) {
      res.json({ success: true, data: { totalTrees: 0, totalKm: 0, totalCO2: 0 } });
      return;
    }

    const counter = await prisma.treeCounter.findUnique({ where: { eventId: eventIdToUse } });
    res.json({
      success: true,
      data: {
        totalTrees: counter?.totalTrees || 0,
        totalKm: counter?.totalKm || 0,
        totalCO2: counter?.totalCO2 || 0,
        manualOverride: counter?.manualOverride || false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tree counter' });
  }
});

treesRouter.get('/counter', async (req: Request, res: Response) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

    let eventIdToUse = eventId;
    if (!eventIdToUse) {
      let event = await prisma.event.findFirst({
        where: { status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] } },
        orderBy: { updatedAt: 'desc' },
      });
      if (!event) {
        event = await prisma.event.findFirst({
          where: { status: 'UPCOMING' },
          orderBy: { date: 'asc' },
        });
      }
      eventIdToUse = event?.id;
    }

    if (!eventIdToUse) {
      res.json({ success: true, data: { totalTrees: 0, totalKm: 0, totalCO2: 0 } });
      return;
    }

    const counter = await prisma.treeCounter.findUnique({ where: { eventId: eventIdToUse } });
    res.json({
      success: true,
      data: {
        totalTrees: counter?.totalTrees || 0,
        totalKm: counter?.totalKm || 0,
        totalCO2: counter?.totalCO2 || 0,
        manualOverride: counter?.manualOverride || false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tree counter' });
  }
});

// Admin manual override — lets an organizer correct the tree count (e.g. to
// match trees actually planted on the ground) without it being clobbered by
// the next GPS ping's automatic recalculation. Setting manualOverride back
// to false resumes automatic distance-based calculation immediately.
treesRouter.patch('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { eventId: bodyEventId, totalTrees, manualOverride } = req.body;
    const eventId = await resolveEventId(typeof bodyEventId === 'string' ? bodyEventId : undefined);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'No event found to update' });
      return;
    }

    if (manualOverride === false) {
      // Resume automatic calculation — clear the flag, then recalc right
      // away so the display doesn't sit on the stale manual value until the
      // next GPS ping happens to arrive.
      await prisma.treeCounter.upsert({
        where: { eventId },
        create: { eventId, manualOverride: false },
        update: { manualOverride: false },
      });
      await recalcTreeCounter(eventId);
      const counter = await prisma.treeCounter.findUnique({ where: { eventId } });
      res.json({ success: true, data: counter });
      return;
    }

    if (typeof totalTrees !== 'number' || totalTrees < 0) {
      res.status(400).json({ success: false, message: 'totalTrees must be a non-negative number' });
      return;
    }

    const totalCO2 = calculateCO2FromTrees(totalTrees);
    const counter = await prisma.treeCounter.upsert({
      where: { eventId },
      create: { eventId, totalTrees, totalCO2, manualOverride: true },
      update: { totalTrees, totalCO2, manualOverride: true },
    });

    const io = getSocketIO();
    const payload = { totalTrees: counter.totalTrees, totalKm: counter.totalKm, totalCO2: counter.totalCO2, increment: 0 };
    io.to(`event:${eventId}`).emit('trees:update', payload);
    io.to(`tracking:${eventId}`).emit('trees:update', payload);
    io.to(`leaderboard:${eventId}`).emit('trees:update', payload);

    res.json({ success: true, data: counter });
  } catch (error) {
    logger.error('Failed to set tree counter override:', error);
    res.status(500).json({ success: false, message: 'Failed to update tree counter' });
  }
});
