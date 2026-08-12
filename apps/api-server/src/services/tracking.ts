import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';

const gpsBuffer = new Map<string, any[]>();

export async function processGpsUpdate(data: {
  participantId: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  altitude?: number;
  timestamp: string;
}): Promise<void> {
  try {
    const bufferKey = data.participantId;
    if (!gpsBuffer.has(bufferKey)) {
      gpsBuffer.set(bufferKey, []);
    }
    gpsBuffer.get(bufferKey)!.push(data);

    if (gpsBuffer.get(bufferKey)!.length >= 10) {
      await flushParticipantGps(bufferKey);
    }
  } catch (error) {
    logger.error('[Tracking] Error processing GPS update:', error);
  }
}

export async function flushGpsLogs(): Promise<void> {
  for (const participantId of gpsBuffer.keys()) {
    await flushParticipantGps(participantId);
  }
}

async function flushParticipantGps(participantId: string): Promise<void> {
  const points = gpsBuffer.get(participantId);
  if (!points || points.length === 0) return;

  try {
    await prisma.gpsLog.createMany({
      data: points.map((p) => ({
        participantId,
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy,
        speed: p.speed ?? null,
        altitude: p.altitude ?? null,
        timestamp: new Date(p.timestamp),
      })),
    });

    gpsBuffer.set(participantId, []);
  } catch (error) {
    logger.error('[Tracking] Error flushing GPS logs:', error);
  }
}

export async function getRunnerPosition(participantId: string) {
  const latestLog = await prisma.gpsLog.findFirst({
    where: { participantId },
    orderBy: { timestamp: 'desc' },
  });

  return latestLog;
}

export async function getRunnerDistance(participantId: string): Promise<number> {
  const logs = await prisma.gpsLog.findMany({
    where: { participantId },
    orderBy: { timestamp: 'asc' },
    select: { lat: true, lng: true },
  });

  if (logs.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < logs.length; i++) {
    totalDistance += calculateDistance(
      logs[i - 1].lat,
      logs[i - 1].lng,
      logs[i].lat,
      logs[i].lng
    );
  }

  return totalDistance;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}