import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { getSocketIO } from '../config/socket.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const announcementsRouter: Router = Router();

// Public read, no auth — these are race-day notices meant to reach every
// runner and spectator, same as before this route was moved onto the DB.
announcementsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { eventId, all } = req.query;
    const announcements = await prisma.announcement.findMany({
      where: {
        ...(all === 'true' ? {} : { active: true }),
        ...(eventId ? { eventId: String(eventId) } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load announcements' });
  }
});

announcementsRouter.post('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { eventId, title, message, location, url, phone, eventDate } = req.body;
    if (!eventId || !title || !message) {
      res.status(400).json({ success: false, message: 'eventId, title, and message required' });
      return;
    }

    const announcement = await prisma.announcement.create({
      data: {
        eventId,
        title,
        message,
        location: location || null,
        url: url || null,
        phone: phone || null,
        eventDate: eventDate ? new Date(eventDate) : null,
      },
    });

    const io = getSocketIO();
    io.to(`event:${eventId}`).emit('announcement', announcement);
    io.to(`tracking:${eventId}`).emit('announcement', announcement);
    io.to(`leaderboard:${eventId}`).emit('announcement', announcement);

    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to send announcement' });
  }
});

announcementsRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { title, message, location, url, phone, eventDate, active } = req.body;
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id as string },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(location !== undefined && { location: location || null }),
        ...(url !== undefined && { url: url || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(eventDate !== undefined && { eventDate: eventDate ? new Date(eventDate) : null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });
    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Announcement not found' });
  }
});

announcementsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Announcement not found' });
  }
});
