import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';

import { setupSocketIO } from './config/socket.js';

import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';

import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { registerRouter } from './routes/register.js';
import { participantsRouter, publicParticipantsRouter } from './routes/participants.js';
import { checkinRouter } from './routes/checkin.js';
import { raceRouter } from './routes/race.js';
import { trackingRouter } from './routes/tracking.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { greenRouter } from './routes/green.js';
import { routesRouter } from './routes/routes.js';
import { announcementsRouter } from './routes/announcements.js';
import { sponsorsRouter } from './routes/sponsors.js';
import { treesRouter } from './routes/trees.js';
import { eventsRouter } from './routes/events.js';
import { qrcodeRouter } from './routes/qrcode.js';
import { certificateRouter } from './routes/certificate.js';
import { analyticsRouter } from './routes/analytics.js';
import { paymentRouter } from './routes/payment.js';
import { bulkRegistrationRouter } from './routes/bulk-registration.js';
import { hrRouter } from './routes/hr.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

app.use('/health', healthRouter);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auth/register', registerRouter);
app.use('/api/v1/participants', publicParticipantsRouter);
app.use('/api/v1/participants', participantsRouter);
app.use('/api/v1/checkin', checkinRouter);
app.use('/api/v1/race', raceRouter);
app.use('/api/v1/routes', routesRouter);
app.use('/api/v1/announcements', announcementsRouter);
app.use('/api/v1/sponsors', sponsorsRouter);
app.use('/api/v1/tracking', trackingRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/green', greenRouter);
app.use('/api/v1/trees', treesRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/qrcode', qrcodeRouter);
app.use('/api/v1/certificates', certificateRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/bulk-registration', bulkRegistrationRouter);
app.use('/api/v1/hr', hrRouter);

app.use('/certificates', express.static(path.join(process.cwd(), 'certificates')));

app.use(errorHandler);

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: CORS_ORIGIN.split(','), methods: ['GET', 'POST'], credentials: true },
  pingInterval: 25000,
  pingTimeout: 20000,
});

setupSocketIO(io);

async function start() {
  httpServer.listen(PORT, () => {
    logger.info(`ISA Marathon API on port ${PORT}`);
    logger.info(`Socket.IO ready`);
    logger.info(`CORS: ${CORS_ORIGIN}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start:', err);
  process.exit(1);
});

export { app, io, httpServer };