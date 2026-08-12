import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

export const eventsRouter = Router();

eventsRouter.get('/', async (_req: Request, res: Response) => {
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
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

eventsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: String(req.params.id) },
      include: {
        _count: { select: { participants: true } },
        raceDistances: {
          orderBy: { distanceKm: 'asc' },
          include: {
            _count: { select: { routePoints: true } },
            routePoints: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch event' });
  }
});

eventsRouter.post('/', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, date, maxParticipants, registrationOpen } = req.body;
    if (!name || !date) {
      res.status(400).json({ success: false, message: 'name and date required' });
      return;
    }
    const eventSlug = slug || slugify(name);
    const event = await prisma.event.create({
      data: {
        name,
        slug: eventSlug,
        description,
        date: new Date(date),
        maxParticipants,
        registrationOpen: registrationOpen ?? true,
      },
    });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
});

eventsRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, description, date, status, maxParticipants, registrationOpen } = req.body;
    const event = await prisma.event.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(status && { status }),
        ...(maxParticipants != null && { maxParticipants }),
        ...(registrationOpen != null && { registrationOpen }),
      },
    });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
});

eventsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.event.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
});

eventsRouter.post('/:id/distances', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);
    const { name, distanceKm } = req.body;
    if (!name || distanceKm == null) {
      res.status(400).json({ success: false, message: 'name and distanceKm required' });
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

eventsRouter.put('/:id/distances/:distanceId', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const distanceId = String(req.params.distanceId);
    const { name, distanceKm } = req.body;
    const raceDistance = await prisma.raceDistance.update({
      where: { id: distanceId },
      data: {
        ...(name && { name }),
        ...(distanceKm != null && { distanceKm }),
      },
    });
    res.json({ success: true, data: raceDistance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update race distance' });
  }
});

eventsRouter.delete('/:id/distances/:distanceId', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    await prisma.raceDistance.delete({ where: { id: String(req.params.distanceId) } });
    res.json({ success: true, message: 'Race distance deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete race distance' });
  }
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
