import { Router } from 'express';

export const announcementsRouter = Router();

announcementsRouter.get('/', async (_req, res) => {
  res.json({ success: true, data: [] });
});