// One-time cleanup for sponsor logos uploaded before server-side resizing
// existed (see routes/sponsors.ts) — some were 1900px+ for a ~50px badge,
// costing megabytes of avoidable weight on every homepage load. Run once
// after deploying that fix:
//   cd apps/api-server && npx tsx scripts/resize-existing-sponsor-logos.ts
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PACKAGE_ROOT } from '../src/config/paths.js';

async function main() {
  const dir = path.join(PACKAGE_ROOT, 'uploads', 'sponsors');
  if (!fs.existsSync(dir)) {
    console.log('No uploads/sponsors directory found — nothing to do.');
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  console.log(`Found ${files.length} raster sponsor logo(s) to check.`);

  let resized = 0;
  let savedBytes = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const before = fs.statSync(filePath).size;
    const buffer = fs.readFileSync(filePath);

    const metadata = await sharp(buffer).metadata();
    if ((metadata.width ?? 0) <= 400 && (metadata.height ?? 0) <= 400) {
      continue; // already small enough
    }

    const out = await sharp(buffer)
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    fs.writeFileSync(filePath, out);

    const after = out.length;
    savedBytes += before - after;
    resized += 1;
    console.log(`  ${file}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
  }

  console.log(`\nResized ${resized}/${files.length} files. Saved ${(savedBytes / 1024 / 1024).toFixed(2)}MB total.`);
}

main().catch((err) => {
  console.error('Resize script failed:', err);
  process.exit(1);
});
