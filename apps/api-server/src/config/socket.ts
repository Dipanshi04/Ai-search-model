import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from './logger.js';
import { processGpsUpdate, flushGpsLogs, evaluateGpsUpdate, distanceToFinishMeters, clearGpsTrackingState } from '../services/tracking.js';
import { getTrackingSettings } from '../services/settings.js';
import { prisma } from './database.js';
import { markRunnerFinished, recalcTreeCounter, updateParticipantTrees } from '../services/greenMission.js';

// Minutes per km since the runner tapped Start. null before either exists,
// or before any real distance has accrued — a 0-distance division would
// otherwise report an infinite/nonsense pace on the very first GPS point.
function computePaceMinPerKm(startedAt: Date | null, distanceKm: number): number | null {
  if (!startedAt || distanceKm <= 0) return null;
  const elapsedMin = (Date.now() - startedAt.getTime()) / 60000;
  return elapsedMin / distanceKm;
}

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
          select: { eventId: true, bibNumber: true, category: true, gender: true, status: true, startedAt: true, name: true, user: { select: { name: true } } },
        });
        if (!participant?.eventId) return;

        const evaluation = await evaluateGpsUpdate(participant.eventId, data);
        if (evaluation.reject) {
          logger.info(`[Tracking] Rejected GPS point for ${data.participantId}: ${evaluation.reject}`);
          return;
        }

        await processGpsUpdate(data);

        // Add just this segment rather than re-summing the whole gps_logs
        // table on every ping — that read used to race the write buffer
        // (points are flushed every 10 or every 5s, not on every ping), so
        // distance could sit stale — sometimes at 0 — for a runner's first
        // several pings. See evaluateGpsUpdate in tracking.ts.
        const updatedParticipant = await prisma.participant.update({
          where: { id: data.participantId },
          data: { totalDistance: { increment: evaluation.segmentKm } },
        });
        const distance = updatedParticipant.totalDistance;
        await updateParticipantTrees(data.participantId);

        let effectiveStatus = participant.status;
        // Minimum 10 minutes since start before the finish-proximity check
        // even runs — without this, a runner is auto-finished the instant
        // they leave the start line whenever a course loops back near
        // itself (start and finish are close together on plenty of routes).
        // Nobody legitimately finishes a 3K/5K in under 10 minutes.
        const minMsSinceStart = 10 * 60 * 1000;
        const pastMinimumTime = participant.startedAt
          ? Date.now() - new Date(participant.startedAt).getTime() >= minMsSinceStart
          : false;
        if (participant.status !== 'FINISHED' && pastMinimumTime) {
          const settings = await getTrackingSettings(participant.eventId);
          const finishDistance = await distanceToFinishMeters(participant.eventId, participant.category, data.lat, data.lng);
          if (finishDistance !== null && finishDistance <= settings.finishThresholdMeters) {
            await markRunnerFinished(data.participantId);
            clearGpsTrackingState(data.participantId);
            effectiveStatus = 'FINISHED';
          }
        }

        // Broadcast runner position to the tracking room (spectator app, LED
        // board — everyone watching the whole field) and to the runner's own
        // room — this is what the runner-app itself listens on, so without
        // it a runner's own distance, status, and auto-finish never reach
        // their own screen, even though they're broadcast to everyone else.
        const io = getSocketIO();
        if (participant?.eventId) {
          const pace = computePaceMinPerKm(participant.startedAt, distance);
          // Rank within category — 1 + how many others in the same category
          // are currently ahead. Cheap relative to the leaderboard query
          // just below, which already scans every participant per ping.
          const rank = 1 + await prisma.participant.count({
            where: { eventId: participant.eventId, category: participant.category, totalDistance: { gt: distance } },
          });

          const updatePayload = {
            participantId: data.participantId,
            eventId: participant.eventId,
            bibNumber: participant.bibNumber,
            category: participant.category,
            gender: participant.gender,
            name: participant.name || participant.user?.name || participant.bibNumber,
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy,
            speed: data.speed,
            distance,
            pace,
            rank,
            status: effectiveStatus,
            timestamp: data.timestamp,
          };
          io.to(`tracking:${participant.eventId}`).emit('runner:update', updatePayload);
          io.to(`runner:${data.participantId}`).emit('runner:update', updatePayload);

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
                name: p.name || p.user?.name || p.bibNumber,
                companyName: p.company?.name,
                gender: p.gender,
                category: p.category,
                distance: p.totalDistance,
                totalDistance: p.totalDistance,
                pace: computePaceMinPerKm(p.startedAt, p.totalDistance),
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
        // The runner-app emits this on every socket connect, not just the
        // real first start — a reconnect (network blip, tab backgrounded
        // then resumed, page reload) fires it again. Overwriting startedAt
        // each time reset the pace clock to "now" on every reconnect,
        // making pace look impossibly fast right after. Only set it once.
        const participant = await prisma.participant.findUnique({
          where: { id: data.participantId },
          select: { startedAt: true },
        });
        await prisma.participant.update({
          where: { id: data.participantId },
          data: { status: 'RUNNING', startedAt: participant?.startedAt ?? new Date() },
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