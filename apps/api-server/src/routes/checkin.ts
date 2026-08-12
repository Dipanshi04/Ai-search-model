import { Router } from 'express';

export const checkinRouter = Router();

checkinRouter.post('/', async (req, res) => {
  res.json({ success: true, message: 'Check-in endpoint' });
});