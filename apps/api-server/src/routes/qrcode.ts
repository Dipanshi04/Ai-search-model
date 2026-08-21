import { Router } from 'express';

export const qrcodeRouter: Router = Router();

qrcodeRouter.get('/:id', async (_req, res) => {
  res.json({ success: true, data: { qrCode: 'data:image/svg+xml;base64,...' } });
});