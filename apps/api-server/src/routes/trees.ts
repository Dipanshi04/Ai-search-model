import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const treesRouter: Router = Router();

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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tree counter' });
  }
});
