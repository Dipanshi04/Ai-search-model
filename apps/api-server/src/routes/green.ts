import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const greenRouter: Router = Router();

greenRouter.get('/stats', async (req: Request, res: Response) => {
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
      res.json({ success: true, data: { trees: 0, co2Saved: 0, totalKm: 0, totalRunners: 0 } });
      return;
    }

    const counter = await prisma.treeCounter.findUnique({ where: { eventId: eventIdToUse } });
    const finishedCount = await prisma.participant.count({
      where: { eventId: eventIdToUse, status: 'FINISHED' },
    });

    res.json({
      success: true,
      data: {
        trees: counter?.totalTrees || 0,
        co2Saved: counter?.totalCO2 || 0,
        totalKm: counter?.totalKm || 0,
        totalRunners: finishedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch green stats' });
  }
});
