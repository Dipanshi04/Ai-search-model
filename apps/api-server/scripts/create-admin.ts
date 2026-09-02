/**
 * Creates (or updates) a single SUPER_ADMIN user — nothing else. Safe to
 * run on production even with real data present; it only touches the one
 * user row matched by --email.
 *
 * Usage (run from apps/api-server):
 *   npx tsx scripts/create-admin.ts --email you@isa.com --password 'RealPassword123!' --name "Your Name" --phone "+919876543210"
 *
 * Re-running with the same --email updates the name/phone/password on the
 * existing row instead of failing on the unique constraint.
 */
import { prisma } from '../src/config/database.js';
import bcrypt from 'bcryptjs';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('email');
  const password = arg('password');
  const name = arg('name') || 'Admin';
  const phone = arg('phone') || `+91${Math.floor(6000000000 + Math.random() * 1000000000)}`;

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-admin.ts --email you@isa.com --password \'RealPassword123!\' [--name "Your Name"] [--phone "+91..."]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters — this is a real production admin account.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: 'SUPER_ADMIN' },
    create: { email, phone, name, passwordHash, role: 'SUPER_ADMIN' },
  });

  console.log(`✅ SUPER_ADMIN ready: ${user.email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
