import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { setFeaturedEvent, clearFeaturedEvent } from '../services/events.js';

export const eventsRouter: Router = Router();

// Which event public displays (LED board, spectator app) show. See
// services/events.ts for why this exists.
eventsRouter.post('/:id/feature', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    await setFeaturedEvent(event.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to set featured event' });
  }
});

eventsRouter.post('/unfeature', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (_req: Request, res: Response) => {
  try {
    await clearFeaturedEvent();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear featured event' });
  }
});

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
    console.error('Events list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

eventsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id as string },
      include: {
        _count: { select: { participants: true } },
        raceDistances: {
          orderBy: { distanceKm: 'asc' },
          include: { _count: { select: { routePoints: true } } },
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
    const { name, description, date, maxParticipants, registrationOpen } = req.body;
    if (!name || !date) {
      res.status(400).json({ success: false, message: 'name and date are required' });
      return;
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/[-]+/g, '-')
      .replace(/^-|-$/g, '');

    const existing = await prisma.event.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const event = await prisma.event.create({
      data: {
        name,
        slug: finalSlug,
        description,
        date: new Date(date),
        maxParticipants,
        registrationOpen: registrationOpen ?? true,
        raceDistances: {
          create: [
            { name: '3K', distanceKm: 3 },
            { name: '5K', distanceKm: 5 },
          ],
        },
      },
      include: { raceDistances: true },
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
});

eventsRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, description, date, status, maxParticipants, registrationOpen, branding } = req.body;
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id as string },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(status !== undefined && { status }),
        ...(maxParticipants !== undefined && { maxParticipants }),
        ...(registrationOpen !== undefined && { registrationOpen }),
        ...(branding !== undefined && { branding }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
});

eventsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    await prisma.event.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    if (error?.code === 'P2003' || error?.code === 'P2014') {
      const eventId = req.params.id as string;
      const [participants, sponsors, announcements] = await Promise.all([
        prisma.participant.count({ where: { eventId } }),
        prisma.sponsor.count({ where: { eventId } }),
        prisma.announcement.count({ where: { eventId } }),
      ]);
      res.status(409).json({
        success: false,
        message: `Cannot delete event: it still has ${participants} participant(s), ${sponsors} sponsor(s), and ${announcements} announcement(s) attached. Remove or reassign those first.`,
      });
      return;
    }
    console.error('[Events] Failed to delete event:', error);
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
});

eventsRouter.post('/:id/distances', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { name, distanceKm } = req.body;
    if (!name || !distanceKm) {
      res.status(400).json({ success: false, message: 'name and distanceKm are required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const distance = await prisma.raceDistance.create({
      data: {
        eventId: req.params.id as string,
        name,
        distanceKm,
      },
    });

    res.status(201).json({ success: true, data: distance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create distance' });
  }
});

eventsRouter.put('/:id/distances/:distanceId', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { name, distanceKm, status } = req.body;
    const distance = await prisma.raceDistance.findUnique({ where: { id: req.params.distanceId as string } });
    if (!distance) {
      res.status(404).json({ success: false, message: 'Distance not found' });
      return;
    }

    const updated = await prisma.raceDistance.update({
      where: { id: req.params.distanceId as string },
      data: {
        ...(name !== undefined && { name }),
        ...(distanceKm !== undefined && { distanceKm }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update distance' });
  }
});

eventsRouter.delete('/:id/distances/:distanceId', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const distance = await prisma.raceDistance.findUnique({ where: { id: req.params.distanceId as string } });
    if (!distance) {
      res.status(404).json({ success: false, message: 'Distance not found' });
      return;
    }
    await prisma.raceDistance.delete({ where: { id: req.params.distanceId as string } });
    res.json({ success: true, message: 'Distance deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete distance' });
  }
});
