import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getSocketIO } from '../config/socket.js';

const KM_PER_TREE = 5;
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
    // Includes runners still mid-race (not just FINISHED) so the counter
    // reflects trees earned in real time as distance accrues, not only at the finish line.
    const stats = await prisma.participant.aggregate({
      where: { eventId },
      _sum: { totalDistance: true },
      _count: { id: true },
    });

    const totalKm = stats._sum.totalDistance || 0;
    // Floor the combined distance, not the sum of each runner's own floored
    // count — two runners at 2.5km each is 5km together (1 tree), but
    // summing floor(2.5/3) + floor(2.5/3) = 0 + 0 undercounts to zero.
    // Per-runner treesCount stays as-is; it's what each certificate shows.
    const totalTrees = calculateTreesFromDistance(totalKm);
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
