import { prisma } from '../config/database.js';

/**
 * Resolves "the event" for callers that weren't given an explicit id —
 * public displays (LED board, spectator app), the tree counter, etc.
 *
 * Order of precedence:
 *   1. An explicit eventId, if the caller has one.
 *   2. Whichever event an admin has pinned as featured (Events tab).
 *   3. The heuristic every route in this codebase used before there was a
 *      way to pin one: most-recently-updated ACTIVE/PAUSED event, else the
 *      soonest UPCOMING one. Kept as a fallback so a fresh event with
 *      nothing pinned yet still resolves to something sensible.
 */
export async function resolveCurrentEventId(explicitEventId?: string): Promise<string | null> {
  if (explicitEventId) return explicitEventId;

  const featured = await prisma.event.findFirst({ where: { isFeatured: true } });
  if (featured) return featured.id;

  const active = await prisma.event.findFirst({
    where: { status: { in: ['ACTIVE', 'PAUSED'] } },
    orderBy: { updatedAt: 'desc' },
  });
  if (active) return active.id;

  const upcoming = await prisma.event.findFirst({
    where: { status: 'UPCOMING' },
    orderBy: { date: 'asc' },
  });
  return upcoming?.id ?? null;
}

/** Pins one event as featured and unpins every other one, atomically. */
export async function setFeaturedEvent(eventId: string): Promise<void> {
  await prisma.$transaction([
    prisma.event.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } }),
    prisma.event.update({ where: { id: eventId }, data: { isFeatured: true } }),
  ]);
}

/** Clears the featured pin so displays fall back to the status heuristic. */
export async function clearFeaturedEvent(): Promise<void> {
  await prisma.event.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } });
}
