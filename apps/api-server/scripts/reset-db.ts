/**
 * One-time production reset — wipes every event, participant, and
 * everything that hangs off them (GPS logs, payments, sponsors,
 * announcements, race routes, bulk registrations, companies), but keeps
 * SUPER_ADMIN users so you can still log in to the admin panel afterward.
 *
 * Safety: runs as a DRY RUN by default — it only prints what it *would*
 * delete, no writes happen. Nothing is actually removed until you pass
 * --confirm.
 *
 * Usage (run from apps/api-server, against whatever DATABASE_URL is in
 * the environment — so on the server, with its real .env sourced):
 *   npx tsx scripts/reset-db.ts              # dry run — counts only
 *   npx tsx scripts/reset-db.ts --confirm     # actually deletes
 *
 * To keep roles other than SUPER_ADMIN, edit KEEP_ROLES below before running.
 */
import { prisma } from '../src/config/database.js';

const KEEP_ROLES = ['SUPER_ADMIN'];
const confirm = process.argv.includes('--confirm');

async function main() {
  console.log(confirm ? '=== LIVE RUN — this will delete data ===' : '=== DRY RUN — no data will be deleted ===');
  console.log(`Users kept: role in [${KEEP_ROLES.join(', ')}]\n`);

  const counts: Record<string, number> = {
    gpsLogs: await prisma.gpsLog.count(),
    payments: await prisma.payment.count(),
    participants: await prisma.participant.count(),
    routePoints: await prisma.routePoint.count(),
    raceDistances: await prisma.raceDistance.count(),
    checkpoints: await prisma.checkpoint.count(),
    sponsors: await prisma.sponsor.count(),
    announcements: await prisma.announcement.count(),
    treeCounters: await prisma.treeCounter.count(),
    settings: await prisma.setting.count(),
    bulkRegistrations: await prisma.bulkRegistration.count(),
    events: await prisma.event.count(),
    companies: await prisma.company.count(),
    usersToDelete: await prisma.user.count({ where: { role: { notIn: KEEP_ROLES as any } } }),
    usersKept: await prisma.user.count({ where: { role: { in: KEEP_ROLES as any } } }),
  };

  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(18)} ${n}`);
  }

  if (!confirm) {
    console.log('\nDry run only — re-run with --confirm to actually delete.');
    process.exit(0);
  }

  console.log('\nDeleting, in dependency order...');

  // Children before parents, matching the FK graph in schema.prisma.
  console.log('gpsLogs:', (await prisma.gpsLog.deleteMany({})).count);
  console.log('payments:', (await prisma.payment.deleteMany({})).count);
  console.log('participants:', (await prisma.participant.deleteMany({})).count);
  console.log('routePoints:', (await prisma.routePoint.deleteMany({})).count);
  console.log('raceDistances:', (await prisma.raceDistance.deleteMany({})).count);
  console.log('checkpoints:', (await prisma.checkpoint.deleteMany({})).count);
  console.log('sponsors:', (await prisma.sponsor.deleteMany({})).count);
  console.log('announcements:', (await prisma.announcement.deleteMany({})).count);
  console.log('treeCounters:', (await prisma.treeCounter.deleteMany({})).count);
  console.log('settings:', (await prisma.setting.deleteMany({})).count);
  console.log('bulkRegistrations:', (await prisma.bulkRegistration.deleteMany({})).count);
  console.log('events:', (await prisma.event.deleteMany({})).count);
  console.log('companies:', (await prisma.company.deleteMany({})).count);
  console.log('users (non-admin):', (await prisma.user.deleteMany({ where: { role: { notIn: KEEP_ROLES as any } } })).count);

  console.log('\nDone. Remaining admin users:');
  const remaining = await prisma.user.findMany({ where: { role: { in: KEEP_ROLES as any } }, select: { email: true, role: true } });
  remaining.forEach((u) => console.log(`  ${u.email} (${u.role})`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
