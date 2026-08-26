import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getSocketIO } from '../config/socket.js';

const KM_PER_TREE = 1;
const CO2_PER_TREE_KG = 22;

export function calculateTreesFromDistance(distanceKm: number): number {
  return Math.floor(distanceKm / KM_PER_TREE);
}

export function calculateCO2FromTrees(trees: number): number {
  return trees * CO2_PER_TREE_KG;
}

export async function updateParticipantTrees(participantId: string): Promise<void> {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { id: true, eventId: true, totalDistance: true, treesCount: true },
    });
    if (!participant || !participant.eventId) return;

    const trees = calculateTreesFromDistance(participant.totalDistance);
    if (trees <= participant.treesCount) return;

    await prisma.participant.update({
      where: { id: participantId },
      data: { treesCount: trees },
    });

    await recalcTreeCounter(participant.eventId);
  } catch (error) {
    logger.error('[GreenMission] Error updating participant trees:', error);
  }
}

export async function recalcTreeCounter(eventId: string): Promise<void> {
  try {
    const stats = await prisma.participant.aggregate({
      where: { eventId, status: 'FINISHED' },
      _sum: { totalDistance: true, treesCount: true },
      _count: { id: true },
    });

    const totalTrees = stats._sum.treesCount || 0;
    const totalKm = stats._sum.totalDistance || 0;
    const totalCO2 = calculateCO2FromTrees(totalTrees);

    await prisma.treeCounter.upsert({
      where: { eventId },
      create: { eventId, totalTrees, totalKm, totalCO2 },
      update: { totalTrees, totalKm, totalCO2 },
    });

    const io = getSocketIO();
    io.to(`event:${eventId}`).emit('trees:update', { totalTrees, totalKm, totalCO2, increment: 0 });
    io.to(`tracking:${eventId}`).emit('trees:update', { totalTrees, totalKm, totalCO2, increment: 0 });
    io.to(`leaderboard:${eventId}`).emit('trees:update', { totalTrees, totalKm, totalCO2, increment: 0 });
  } catch (error) {
    logger.error('[GreenMission] Error recalculating tree counter:', error);
  }
}

export async function markRunnerFinished(participantId: string): Promise<void> {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { id: true, eventId: true, totalDistance: true, status: true },
    });
    if (!participant || participant.status === 'FINISHED') return;

    const trees = calculateTreesFromDistance(participant.totalDistance);

    await prisma.participant.update({
      where: { id: participantId },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        treesCount: trees,
      },
    });

    if (participant.eventId) {
      await recalcTreeCounter(participant.eventId);
    }

    logger.info(`[GreenMission] Runner ${participantId} finished: ${trees} trees, ${participant.totalDistance}km`);
  } catch (error) {
    logger.error('[GreenMission] Error marking runner finished:', error);
  }
}
