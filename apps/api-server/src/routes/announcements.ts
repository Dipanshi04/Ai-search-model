import { Router } from 'express';

export const announcementsRouter: Router = Router();

announcementsRouter.get('/', async (_req, res) => {
  res.json({ success: true, data: [] });
});