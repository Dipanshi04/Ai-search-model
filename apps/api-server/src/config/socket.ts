import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from './logger.js';
import { processGpsUpdate, flushGpsLogs, getRunnerDistance, evaluateGpsUpdate, distanceToFinishMeters, clearGpsTrackingState } from '../services/tracking.js';
import { getTrackingSettings } from '../services/settings.js';
import { prisma } from './database.js';
import { markRunnerFinished, recalcTreeCounter, updateParticipantTrees } from '../services/greenMission.js';

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
        // Resolved once and reused for the accuracy/outlier gate, the
        // finish-threshold check, and the broadcast below — one query
        // instead of the two this used to take.
        const participant = await prisma.participant.findUnique({
          where: { id: data.participantId },
          select: { eventId: true, bibNumber: true, category: true, status: true, user: { select: { name: true } } },
        });
        if (!participant?.eventId) return;

        const rejectReason = await evaluateGpsUpdate(participant.eventId, data);
        if (rejectReason) {
          logger.info(`[Tracking] Rejected GPS point for ${data.participantId}: ${rejectReason}`);
          return;
        }

        await processGpsUpdate(data);

        // Update total distance from GPS logs
        const distance = await getRunnerDistance(data.participantId);
        await prisma.participant.update({
          where: { id: data.participantId },
          data: { totalDistance: distance },
        });
        await updateParticipantTrees(data.participantId);

        if (participant.status !== 'FINISHED') {
          const settings = await getTrackingSettings(participant.eventId);
          const finishDistance = await distanceToFinishMeters(participant.eventId, participant.category, data.lat, data.lng);
          if (finishDistance !== null && finishDistance <= settings.finishThresholdMeters) {
            await markRunnerFinished(data.participantId);
            clearGpsTrackingState(data.participantId);
          }
        }

        // Broadcast runner position to tracking room
        const io = getSocketIO();
        if (participant?.eventId) {
          io.to(`tracking:${participant.eventId}`).emit('runner:update', {
            participantId: data.participantId,
            eventId: participant.eventId,
            bibNumber: participant.bibNumber,
            category: participant.category,
            name: participant.user?.name || participant.bibNumber,
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy,
            speed: data.speed,
            distance,
            timestamp: data.timestamp,
          });

          // Emit leaderboard update for all categories
          const categories = ['overall', participant.category];
          for (const cat of categories) {
            const where: any = { eventId: participant.eventId };
            if (cat !== 'overall') where.category = cat;
            
            const top10 = await prisma.participant.findMany({
              where,
              include: { 
                user: { select: { name: true, email: true } },
                company: { select: { name: true } },
              },
              orderBy: { totalDistance: 'desc' },
              take: 10,
            });

            io.to(`leaderboard:${participant.eventId}`).emit('leaderboard:update', {
              category: cat,
              top10: top10.map((p, i) => ({
                rank: i + 1,
                participantId: p.id,
                id: p.id,
                bibNumber: p.bibNumber,
                name: p.user?.name || p.bibNumber,
                companyName: p.company?.name,
                gender: p.gender,
                category: p.category,
                distance: p.totalDistance,
                totalDistance: p.totalDistance,
                pace: null,
                status: p.status,
              })),
            });
          }
        }
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

    socket.on('runner:finish', async (data: { participantId: string }) => {
      try {
        await markRunnerFinished(data.participantId);
      } catch (error) {
        logger.error('[Socket] Runner finish error:', error);
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