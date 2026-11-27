/**
 * Local PostgreSQL for development / CI in environments without Docker or root.
 * Uses the embedded-postgres binaries (dev dependency only — never shipped).
 *
 *   node apps/server/scripts/dev-db.mjs
 *
 * Environment: PGDATA_DIR (default /tmp/voidlink-pg), PGPORT (default 55432).
 */
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = process.env.PGDATA_DIR ?? '/tmp/voidlink-pg';
const port = Number(process.env.PGPORT ?? 55432);

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'voidlink',
  password: 'voidlink',
  port,
  persistent: true,
  autoRehydrateSymlinks: true,
  onLog: () => {},
  onError: (message) => console.error('[pg]', message),
});

const fresh = !fs.existsSync(`${databaseDir}/PG_VERSION`);
if (fresh) {
  console.log('[pg] initialising cluster at', databaseDir);
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase('voidlink');
} catch {
  // already exists
}

console.log(`PG_READY postgresql://voidlink:voidlink@127.0.0.1:${port}/voidlink`);

const shutdown = async () => {
  await pg.stop().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
setInterval(() => {}, 1 << 30);
