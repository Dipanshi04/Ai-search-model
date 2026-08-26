import { Router, Request, Response } from 'express';
import { getSocketIO } from '../config/socket.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const announcementsRouter: Router = Router();

// In-memory store for announcements (resets on server restart)
const announcementsStore: { id: string; title: string; message: string; eventId: string; createdAt: string }[] = [];

announcementsRouter.get('/', async (_req, res) => {
  res.json({ success: true, data: announcementsStore });
});

announcementsRouter.post('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { eventId, title, message } = req.body;
    if (!eventId || !title || !message) {
      res.status(400).json({ success: false, message: 'eventId, title, and message required' });
      return;
    }

    const announcement = {
      id: Date.now().toString(),
      title,
      message,
      eventId,
      createdAt: new Date().toISOString(),
    };
    announcementsStore.unshift(announcement);

    const io = getSocketIO();
    io.to(`event:${eventId}`).emit('announcement', { title, message, eventId });
    io.to(`tracking:${eventId}`).emit('announcement', { title, message, eventId });
    io.to(`leaderboard:${eventId}`).emit('announcement', { title, message, eventId });

    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to send announcement' });
  }
});

announcementsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = announcementsStore.findIndex((a) => a.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }
    announcementsStore.splice(index, 1);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});