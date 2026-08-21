import { Router } from 'express';

export const sponsorsRouter: Router = Router();

sponsorsRouter.get('/', async (_req, res) => {
  res.json({ success: true, data: [] });
});