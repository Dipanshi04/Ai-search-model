import { prisma } from '../config/database.js';

export interface TrackingSettings {
  maxAccuracyMeters: number;
  outlierDistanceMeters: number;
  finishThresholdMeters: number;
}

export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  maxAccuracyMeters: 40,
  outlierDistanceMeters: 50,
  finishThresholdMeters: 30,
};

const TRACKING_KEYS = ['MAX_ACCURACY_METERS', 'OUTLIER_DISTANCE_METERS', 'FINISH_THRESHOLD_METERS'] as const;

// Short-lived cache so the hot GPS-ingestion path never does a settings
// lookup per ping — see the scale notes in tracking.ts.
const cache = new Map<string, { settings: TrackingSettings; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

export async function getTrackingSettings(eventId: string): Promise<TrackingSettings> {
  const hit = cache.get(eventId);
  if (hit && hit.expiresAt > Date.now()) return hit.settings;

  const rows = await prisma.setting.findMany({
    where: { eventId, key: { in: TRACKING_KEYS as unknown as string[] } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const settings: TrackingSettings = {
    maxAccuracyMeters: Number(byKey.get('MAX_ACCURACY_METERS') ?? DEFAULT_TRACKING_SETTINGS.maxAccuracyMeters),
    outlierDistanceMeters: Number(byKey.get('OUTLIER_DISTANCE_METERS') ?? DEFAULT_TRACKING_SETTINGS.outlierDistanceMeters),
    finishThresholdMeters: Number(byKey.get('FINISH_THRESHOLD_METERS') ?? DEFAULT_TRACKING_SETTINGS.finishThresholdMeters),
  };

  cache.set(eventId, { settings, expiresAt: Date.now() + CACHE_TTL_MS });
  return settings;
}

export function invalidateTrackingSettingsCache(eventId: string): void {
  cache.delete(eventId);
}
