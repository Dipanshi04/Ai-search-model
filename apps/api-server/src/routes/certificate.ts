import { Router } from 'express';

export const certificateRouter: Router = Router();

certificateRouter.get('/:id', async (_req, res) => {
  res.json({ success: true, data: { certificateUrl: '/certificates/test.pdf' } });
});