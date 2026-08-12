import { Router } from 'express';

export const qrcodeRouter = Router();

qrcodeRouter.get('/:id', async (req, res) => {
  res.json({ success: true, data: { qrCode: 'data:image/svg+xml;base64,...' } });
});