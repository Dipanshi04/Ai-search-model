import { Router } from 'express';

export const trackingRouter = Router();

trackingRouter.get('/positions', async (req, res) => {
  const { eventId } = req.query;
  res.json({ success: true, data: [] });
});