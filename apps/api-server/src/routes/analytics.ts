import { Router } from 'express';
import { prisma } from '../config/database.js';

export const analyticsRouter: Router = Router();

analyticsRouter.get('/', async (_req, res) => {
  try {
    const [totalRunners, totalDistanceResult, totalEvents, totalCompanies] = await Promise.all([
      prisma.participant.count(),
      prisma.participant.aggregate({ _sum: { totalDistance: true } }),
      prisma.event.count(),
      prisma.company.count(),
    ]);

    res.json({
      success: true,
      data: {
        totalRunners,
        totalDistance: totalDistanceResult._sum.totalDistance ?? 0,
        totalEvents,
        totalCompanies,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

analyticsRouter.get('/overview', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
    const where = eventId ? { eventId } : {};

    const [totalParticipants, checkedIn, running, finished, dnf, byCategory, byGender] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.participant.count({ where: { ...where, checkedIn: true } }),
      prisma.participant.count({ where: { ...where, status: 'RUNNING' } }),
      prisma.participant.count({ where: { ...where, status: 'FINISHED' } }),
      prisma.participant.count({ where: { ...where, status: 'DNF' } }),
      prisma.participant.groupBy({ by: ['category'], where, _count: { category: true } }),
      prisma.participant.groupBy({ by: ['gender'], where, _count: { gender: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalParticipants,
        checkedIn,
        running,
        finished,
        dnf,
        finishRate: totalParticipants > 0 ? Math.round(((finished + dnf) / totalParticipants) * 100) : 0,
        byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.category })),
        byGender: byGender.map((g) => ({ gender: g.gender, count: g._count.gender })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch overview analytics' });
  }
});

analyticsRouter.get('/finish-rate', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
    const where = eventId ? { eventId } : {};

    const [total, finished] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.participant.count({ where: { ...where, status: { in: ['FINISHED', 'DNF'] } } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        finished,
        rate: total > 0 ? Math.round((finished / total) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch finish rate' });
  }
});

analyticsRouter.get('/pace-distribution', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
    const where = eventId ? { eventId, pace: { not: null } } : { pace: { not: null } };

    const participants = await prisma.participant.findMany({
      where,
      select: { pace: true },
    });

    const buckets: Record<string, number> = {};
    for (const p of participants) {
      if (p.pace === null) continue;
      const bucket = Math.floor(p.pace);
      const key = `${bucket}-${bucket + 1} min/km`;
      buckets[key] = (buckets[key] || 0) + 1;
    }

    res.json({
      success: true,
      data: Object.entries(buckets).map(([range, count]) => ({ range, count })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pace distribution' });
  }
});

analyticsRouter.get('/company-participation', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
    const where = eventId ? { eventId } : {};

    const companies = await prisma.company.findMany({
      include: {
        participants: {
          where,
          select: { id: true, totalDistance: true, status: true },
        },
      },
    });

    const data = companies
      .filter((c) => c.participants.length > 0)
      .map((c) => ({
        companyId: c.id,
        companyName: c.name,
        totalParticipants: c.participants.length,
        totalDistance: c.participants.reduce((sum, p) => sum + p.totalDistance, 0),
        finished: c.participants.filter((p) => p.status === 'FINISHED').length,
      }))
      .sort((a, b) => b.totalParticipants - a.totalParticipants);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch company participation' });
  }
});

analyticsRouter.get('/finish-times', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
    const where = eventId
      ? { eventId, finishTime: { not: null } }
      : { finishTime: { not: null } };

    const participants = await prisma.participant.findMany({
      where,
      select: { finishTime: true, bibNumber: true, user: { select: { name: true } } },
      orderBy: { finishTime: 'asc' },
      take: 100,
    });

    res.json({
      success: true,
      data: participants.map((p) => ({
        rank: participants.indexOf(p) + 1,
        bibNumber: p.bibNumber,
        name: p.user.name,
        finishTime: p.finishTime,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch finish times' });
  }
});
