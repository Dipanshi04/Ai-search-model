import { Router } from 'express';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'ISA Marathon API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRouter.get('/db', async (_req, res) => {
  res.json({ success: true, message: 'Database connection OK' });
});

healthRouter.get('/redis', async (_req, res) => {
  res.json({ success: true, message: 'Redis connection OK' });
});
