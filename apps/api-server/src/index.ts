import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Real entry point. Everything else lives in server.ts and is loaded below
// via a dynamic import — not a static one.
//
// Static `import` statements are hoisted by the ES module spec: every
// module a file statically imports is fully loaded and executed BEFORE any
// of that file's own top-level code runs, no matter where the import
// appears in the source. Several modules in this app read process.env at
// module load time (services/email.ts's transporter config, the Prisma
// client's datasource, the Cashfree client, etc.) — under real compiled
// ESM (what production's `node dist/index.js` actually runs), those all
// executed before dotenv.config() ever got a chance to run, so they read
// undefined regardless of what was in the .env file. `tsx` in dev mode
// transpiles differently and never hit this, which is why it always looked
// fine locally. A dynamic import() is a runtime expression, not hoisted —
// it only resolves once actually awaited — so this guarantees dotenv has
// already populated process.env before server.ts (or anything it imports)
// is even loaded.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

await import('./server.js');
