import { Router } from 'express';

export const trackingRouter: Router = Router();

trackingRouter.get('/positions', async (_req, res) => {
  res.json({ success: true, data: [] });
});