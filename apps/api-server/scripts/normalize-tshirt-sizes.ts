/**
 * One-time cleanup: collapses t-shirt size values that only differ by
 * casing (e.g. "Xl", "xl" -> "XL") or that should be merged into another
 * size (XS -> S, 2XL -> XXL), using the same normalizeTshirtSize() logic
 * new writes go through from now on (see src/utils/validation.ts). Without
 * this, existing rows written before that normalization was added stay
 * split across near-duplicate buckets forever.
 *
 * Safe to re-run — it's idempotent (already-normalized rows are simply
 * left alone) and only ever touches the tshirtSize column.
 *
 * Usage (run from apps/api-server):
 *   npx tsx scripts/normalize-tshirt-sizes.ts          # dry run — reports what would change
 *   npx tsx scripts/normalize-tshirt-sizes.ts --apply  # actually writes the changes
 */
import { prisma } from '../src/config/database.js';
import { normalizeTshirtSize } from '../src/utils/validation.js';

async function main() {
  const apply = process.argv.includes('--apply');

  const rows = await prisma.participant.groupBy({
    by: ['tshirtSize'],
    where: { tshirtSize: { not: null } },
    _count: { tshirtSize: true },
  });

  const changes = rows
    .map((r) => ({ from: r.tshirtSize as string, to: normalizeTshirtSize(r.tshirtSize), count: r._count.tshirtSize }))
    .filter((c) => c.to !== c.from);

  if (changes.length === 0) {
    console.log('Nothing to normalize — all t-shirt sizes are already canonical.');
    return;
  }

  console.log(apply ? 'Applying:' : 'Would apply (dry run — pass --apply to write):');
  for (const c of changes) {
    console.log(`  "${c.from}" (${c.count}) -> "${c.to}"`);
  }

  if (!apply) return;

  for (const c of changes) {
    const result = await prisma.participant.updateMany({
      where: { tshirtSize: c.from },
      data: { tshirtSize: c.to },
    });
    console.log(`  Updated ${result.count} row(s): "${c.from}" -> "${c.to}"`);
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
