import { Router } from 'express';
import { prisma } from '../config/database.js';

export const participantsRouter = Router();

participantsRouter.get('/', async (_req, res) => {
  const participants = await prisma.participant.findMany({
    include: { user: true },
    take: 500,
  });
  res.json({ success: true, data: participants });
});

participantsRouter.get('/leaderboard', async (req, res) => {
  const { eventId, limit = '100' } = req.query;
  const participants = await prisma.participant.findMany({
    where: { eventId: eventId as string || 'default-event-id' },
    include: { user: true },
    orderBy: { totalDistance: 'desc' },
    take: parseInt(limit as string),
  });
  res.json({ success: true, data: participants });
});

export const publicParticipantsRouter = Router();

publicParticipantsRouter.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: [] });
  
  const participants = await prisma.participant.findMany({
    where: {
      OR: [
        { bibNumber: { contains: q as string, mode: 'insensitive' } },
        { user: { name: { contains: q as string, mode: 'insensitive' } } },
        { company: { name: { contains: q as string, mode: 'insensitive' } } },
      ],
    },
    include: { user: true, company: true },
    take: 20,
  });
  res.json({ success: true, data: participants });
});