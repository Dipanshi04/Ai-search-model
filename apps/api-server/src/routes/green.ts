import { Router } from 'express';

export const greenRouter: Router = Router();

greenRouter.get('/stats', async (_req, res) => {
  res.json({ success: true, data: { trees: 0, co2Saved: 0 } });
});