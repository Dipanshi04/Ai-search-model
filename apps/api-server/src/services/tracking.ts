import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { getTrackingSettings } from './settings.js';

const gpsBuffer = new Map<string, any[]>();

// Last accepted point per runner, kept in memory purely to test the next
// point's jump distance against OUTLIER_DISTANCE_METERS without a DB read
// on the hot per-ping path.
const lastAcceptedPoint = new Map<string, { lat: number; lng: number; timestamp: number }>();

export type GpsRejectReason = 'inaccurate' | 'outlier' | null;

export interface GpsEvaluation {
  reject: GpsRejectReason;
  // Distance in km covered since the runner's last accepted point — the
  // caller adds this straight to totalDistance rather than re-deriving it
  // by re-scanning gps_logs (see the comment on segmentKm's caller).
  segmentKm: number;
}

/**
 * Accuracy and outlier gate, run before a point ever reaches the buffer.
 * Keeps a single bad GPS fix (a building-bounce, an implausible jump) from
 * corrupting distance, the leaderboard, and the tree counter. Also hands
 * back the incremental distance for this one segment — see socket.ts.
 */
export async function evaluateGpsUpdate(
  eventId: string,
  data: { participantId: string; lat: number; lng: number; accuracy: number; timestamp: string }
): Promise<GpsEvaluation> {
  const settings = await getTrackingSettings(eventId);

  if (data.accuracy > settings.maxAccuracyMeters) {
    return { reject: 'inaccurate', segmentKm: 0 };
  }

  let last = lastAcceptedPoint.get(data.participantId);
  if (!last) {
    // Not the runner's actual first point necessarily — just the first one
    // this process has seen (e.g. right after a restart). Check for a real
    // last position so a restart doesn't silently drop that segment.
    const lastLog = await prisma.gpsLog.findFirst({
      where: { participantId: data.participantId },
      orderBy: { timestamp: 'desc' },
      select: { lat: true, lng: true, timestamp: true },
    });
    if (lastLog) {
      last = { lat: lastLog.lat, lng: lastLog.lng, timestamp: lastLog.timestamp.getTime() };
    }
  }

  let segmentKm = 0;
  if (last) {
    const jumpMeters = calculateDistance(last.lat, last.lng, data.lat, data.lng) * 1000;
    if (jumpMeters > settings.outlierDistanceMeters) {
      const elapsedSec = Math.max(1, (new Date(data.timestamp).getTime() - last.timestamp) / 1000);
      // A big jump is only an outlier if it also implies an impossible
      // pace — a runner who's been stationary a while covering real ground
      // on the next ping shouldn't be rejected just for a sparse buffer.
      const impliedKmh = (jumpMeters / 1000) / (elapsedSec / 3600);
      if (impliedKmh > 25) {
        return { reject: 'outlier', segmentKm: 0 };
      }
    }
    segmentKm = jumpMeters / 1000;
  }

  lastAcceptedPoint.set(data.participantId, {
    lat: data.lat,
    lng: data.lng,
    timestamp: new Date(data.timestamp).getTime(),
  });
  return { reject: null, segmentKm };
}

export function clearGpsTrackingState(participantId: string): void {
  lastAcceptedPoint.delete(participantId);
}

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

/**
 * Distance in meters from a point to the finish line — the last point of
 * the runner's race route. Returns null when the route has no points, so
 * callers can skip the finish-threshold check rather than false-positive.
 */
export async function distanceToFinishMeters(
  eventId: string,
  category: string,
  lat: number,
  lng: number
): Promise<number | null> {
  const targetKm = category === 'RUN_5K' ? 5 : 3;
  const raceDistance = await prisma.raceDistance.findFirst({
    where: { eventId, distanceKm: targetKm },
    orderBy: { createdAt: 'asc' },
  });
  if (!raceDistance) return null;

  const finishPoint = await prisma.routePoint.findFirst({
    where: { raceDistanceId: raceDistance.id },
    orderBy: { sequence: 'desc' },
  });
  if (!finishPoint) return null;

  return calculateDistance(lat, lng, finishPoint.lat, finishPoint.lng) * 1000;
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

// Not used on the live GPS path anymore — evaluateGpsUpdate's segmentKm
// covers that incrementally. Kept for a from-scratch recompute (e.g. an
// admin "recalculate this runner's distance" tool) if that's ever needed.
export async function getRunnerDistance(participantId: string): Promise<number> {
  const logs = await prisma.gpsLog.findMany({
    where: { participantId },
    orderBy: { timestamp: 'asc' },
    select: { lat: true, lng: true },
  });

  if (logs.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1]!;
    const curr = logs[i]!;
    totalDistance += calculateDistance(
      prev.lat,
      prev.lng,
      curr.lat,
      curr.lng
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