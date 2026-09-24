/**
 * One-time cleanup for participants whose paymentStatus is COMPLETED but
 * status is still stuck on PENDING_PAYMENT — caused by the manual "mark
 * payment complete" admin override, which used to only write paymentStatus
 * and never advanced status to match (fixed in participants.ts PUT /:id;
 * this script only backfills rows that already went through the old code
 * path before that fix).
 *
 * Safe to re-run — idempotent, only touches rows matching the mismatch.
 *
 * Usage (run from apps/api-server):
 *   npx tsx scripts/fix-completed-payment-status.ts          # dry run
 *   npx tsx scripts/fix-completed-payment-status.ts --apply  # actually writes
 */
import { prisma } from '../src/config/database.js';

async function main() {
  const apply = process.argv.includes('--apply');

  const mismatched = await prisma.participant.findMany({
    where: { paymentStatus: 'COMPLETED', status: 'PENDING_PAYMENT' },
    select: { id: true, bibNumber: true, name: true, user: { select: { name: true } } },
  });

  if (mismatched.length === 0) {
    console.log('Nothing to fix — no participants with paymentStatus COMPLETED but status PENDING_PAYMENT.');
    return;
  }

  console.log(apply ? 'Fixing:' : 'Would fix (dry run — pass --apply to write):');
  for (const p of mismatched) {
    console.log(`  ${p.bibNumber} — ${p.name || p.user?.name}`);
  }

  if (!apply) return;

  const result = await prisma.participant.updateMany({
    where: { id: { in: mismatched.map((p) => p.id) } },
    data: { status: 'REGISTERED' },
  });
  console.log(`Updated ${result.count} participant(s) to REGISTERED.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
