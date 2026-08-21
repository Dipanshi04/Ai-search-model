import { Router } from 'express';

export const leaderboardRouter: Router = Router();

leaderboardRouter.get('/', async (_req, res) => {
  res.json({ success: true, data: [] });
});