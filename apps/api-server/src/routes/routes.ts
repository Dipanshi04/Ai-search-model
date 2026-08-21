import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

export const routesRouter: Router = Router();

routesRouter.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.eventId);
    const raceDistances = await prisma.raceDistance.findMany({
      where: { eventId },
      orderBy: { distanceKm: 'asc' },
    });
    res.json({ success: true, data: raceDistances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch race distances' });
  }
});

routesRouter.get('/:raceDistanceId', async (req: Request, res: Response) => {
  try {
    const raceDistanceId = String(req.params.raceDistanceId);
    const raceDistance = await prisma.raceDistance.findUnique({
      where: { id: raceDistanceId },
      include: { routePoints: { orderBy: { sequence: 'asc' } } },
    });
    if (!raceDistance) {
      res.status(404).json({ success: false, message: 'Race distance not found' });
      return;
    }
    res.json({ success: true, data: raceDistance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch route' });
  }
});

routesRouter.post('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { raceDistanceId, points } = req.body;
    if (!raceDistanceId || !Array.isArray(points)) {
      res.status(400).json({ success: false, message: 'raceDistanceId and points array required' });
      return;
    }

    await prisma.routePoint.deleteMany({ where: { raceDistanceId } });

    let runningCum = 0;
    const routePointData = points.map((p: { lat: number; lng: number; cumDistance?: number }, i: number) => {
      if (i > 0) {
        const prev = points[i - 1] as { lat: number; lng: number };
        runningCum += haversineKm(prev.lat, prev.lng, p.lat, p.lng);
      }
      return {
        raceDistanceId,
        sequence: i + 1,
        lat: p.lat,
        lng: p.lng,
        cumDistance: p.cumDistance ?? Math.round(runningCum * 1000) / 1000,
      };
    });

    const created = await prisma.routePoint.createMany({
      data: routePointData,
    });

    const totalDistance = routePointData.length > 0
      ? routePointData[routePointData.length - 1]?.cumDistance ?? 0
      : 0;

    await prisma.raceDistance.update({
      where: { id: raceDistanceId },
      data: { totalDistance },
    });

    res.json({ success: true, data: { count: created.count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save route' });
  }
});

routesRouter.post('/race-distance', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { eventId, name, distanceKm } = req.body;
    if (!eventId || !name || distanceKm == null) {
      res.status(400).json({ success: false, message: 'eventId, name, and distanceKm required' });
      return;
    }

    const raceDistance = await prisma.raceDistance.create({
      data: { eventId, name, distanceKm },
    });

    res.status(201).json({ success: true, data: raceDistance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create race distance' });
  }
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
