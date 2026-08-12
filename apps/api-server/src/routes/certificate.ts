import { Router } from 'express';

export const certificateRouter = Router();

certificateRouter.get('/:id', async (req, res) => {
  res.json({ success: true, data: { certificateUrl: '/certificates/test.pdf' } });
});