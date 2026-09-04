import path from 'path';
import { fileURLToPath } from 'url';

// Resolved from this file's own compiled location (dist/config/paths.js),
// not process.cwd() — those differ between `pnpm dev` (cwd is apps/api-server)
// and PM2 in production, where ecosystem.config.js sets cwd to the repo
// root. Every uploads/certificates read or write must go through this
// constant, not process.cwd(), or the write and serve sides end up looking
// in two different directories in production.
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
