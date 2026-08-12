import { Router } from 'express';

export const treesRouter = Router();

treesRouter.get('/', async (_req, res) => {
  res.json({ success: true, data: { totalTrees: 0 } });
});