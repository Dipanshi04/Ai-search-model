/**
 * One-time import of a company list CSV (single "Company Name" column,
 * already deduplicated/uppercased) into the Company table. Every imported
 * company defaults to NON_PREMIUM — the CSV carries no premium/non-premium
 * signal, so that's set later by hand in the admin panel (Companies page)
 * for whichever ones should be marked Premium.
 *
 * Existing companies (matched by exact name) are left untouched — this
 * only adds rows that don't already exist, it never overwrites a status
 * an admin already set.
 *
 * Usage (run from apps/api-server):
 *   npx tsx scripts/import-companies.ts /path/to/companies.csv
 */
import { prisma } from '../src/config/database.js';
import fs from 'fs';

function parseCsvColumn(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const rows: string[] = [];
  for (const line of lines.slice(1)) { // skip header
    const trimmed = line.trim();
    if (!trimmed) continue;
    let value = trimmed;
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"');
    }
    rows.push(value.trim().toUpperCase());
  }
  return rows;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-companies.ts /path/to/companies.csv');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const names = [...new Set(parseCsvColumn(content))].filter(Boolean);
  console.log(`Parsed ${names.length} unique company names from CSV.`);

  let created = 0;
  let skipped = 0;
  for (const name of names) {
    const existing = await prisma.company.findUnique({ where: { name } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.company.create({ data: { name, status: 'NON_PREMIUM' } });
    created++;
  }

  console.log(`Done. Created: ${created}, already existed (skipped): ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
