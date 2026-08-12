import { Router } from 'express';

export const analyticsRouter = Router();

analyticsRouter.get('/', async (_req, res) => {
  res.json({ success: true, data: { totalRunners: 0, totalDistance: 0 } });
});