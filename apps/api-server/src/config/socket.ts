import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from './logger.js';
import { processGpsUpdate, flushGpsLogs } from '../services/tracking.js';
import { prisma } from './database.js';

let ioInstance: SocketIOServer | null = null;

export function setupSocketIO(io: SocketIOServer): void {
  ioInstance = io;

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (token) {
        const { verifyToken } = await import('../utils/jwt.js');
        const decoded = verifyToken(token);
        socket.data.user = decoded;
      }
    } catch {
      // Allow unauthenticated spectators
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`[Socket] Connected: ${socket.id} (user: ${socket.data.user?.email || 'anonymous'})`);

    socket.on('join:event', (eventId: string) => {
      socket.join(`event:${eventId}`);
    });

    socket.on('join:tracking', (eventId: string) => {
      socket.join(`tracking:${eventId}`);
    });

    socket.on('join:leaderboard', (eventId: string) => {
      socket.join(`leaderboard:${eventId}`);
    });

    socket.on('join:runner', (participantId: string) => {
      socket.join(`runner:${participantId}`);
    });

    socket.on('runner:update', (data: any) => {
      const io = getSocketIO();
      if (data.eventId) {
        io.to(`tracking:${data.eventId}`).emit('runner:update', data);
      }
      if (data.participantId) {
        io.to(`runner:${data.participantId}`).emit('runner:update', data);
      }
    });

    socket.on('gps:update', async (data: {
      participantId: string;
      lat: number;
      lng: number;
      accuracy: number;
      speed?: number;
      altitude?: number;
      timestamp: string;
    }) => {
      try {
        await processGpsUpdate(data);
      } catch (error) {
        logger.error('[Socket] GPS processing error:', error);
      }
    });

    socket.on('runner:start', async (data: { participantId: string }) => {
      try {
        await prisma.participant.update({
          where: { id: data.participantId },
          data: { status: 'RUNNING', startedAt: new Date() },
        });
        logger.info(`[Socket] Runner started: ${data.participantId}`);
      } catch (error) {
        logger.error('[Socket] Runner start error:', error);
      }
    });

    socket.on('runner:pause', async (data: { participantId: string }) => {
      try {
        await prisma.participant.update({
          where: { id: data.participantId },
          data: { status: 'PAUSED' },
        });
      } catch (error) {
        logger.error('[Socket] Runner pause error:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });
  });

  setInterval(async () => {
    await flushGpsLogs();
  }, 5000);

  logger.info('[Socket] Socket.IO server configured');
}

export function getSocketIO(): SocketIOServer {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
}