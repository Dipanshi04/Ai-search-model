import { Router } from 'express';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', async (req, res) => {
  const { eventId, category } = req.query;
  res.json({ success: true, data: [] });
});