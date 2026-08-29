import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { invalidateTrackingSettingsCache } from '../services/settings.js';

export const settingsRouter: Router = Router();

settingsRouter.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.setting.findMany({ where: { eventId: req.params.eventId as string } });
    const data: Record<string, unknown> = {};
    for (const row of rows) data[row.key] = row.value;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

settingsRouter.put('/:eventId', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const entries = Object.entries(req.body as Record<string, unknown>);
    if (entries.length === 0) {
      res.status(400).json({ success: false, message: 'No settings provided' });
      return;
    }

    await Promise.all(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { eventId_key: { eventId, key } },
          update: { value: value as any },
          create: { eventId, key, value: value as any },
        })
      )
    );

    invalidateTrackingSettingsCache(eventId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});
