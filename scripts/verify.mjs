#!/usr/bin/env node
/**
 * One-command verification: runs the same checks as .github/workflows/ci.yml
 * (typechecks, server tests, media verification, web build) against the local
 * embedded PostgreSQL from apps/server/scripts/dev-db.mjs.
 *
 *   npm run verify
 *
 * If something is already listening on the database port (e.g. an earlier
 * `npm run db:local -w @voidlink/server`) it is reused; otherwise an embedded
 * PostgreSQL is started for the run and stopped again afterwards.
 *
 * Environment: PGPORT (default 55432), DATABASE_URL (defaults to that port).
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

const PORT = Number(process.env.PGPORT ?? 55432);
const DATABASE_URL =
  process.env.DATABASE_URL ?? `postgresql://voidlink:voidlink@127.0.0.1:${PORT}/voidlink`;
const env = { ...process.env, DATABASE_URL };

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const steps = [
  ['Generate Prisma client', npx, ['prisma', 'generate', '--schema', 'apps/server/prisma/schema.prisma']],
  ['Apply migrations', npx, ['prisma', 'migrate', 'deploy', '--schema', 'apps/server/prisma/schema.prisma']],
  ['Typecheck shared', npm, ['run', 'typecheck', '-w', '@voidlink/shared']],
  ['Typecheck server', npm, ['run', 'typecheck', '-w', '@voidlink/server']],
  ['Typecheck web', npm, ['run', 'typecheck', '-w', '@voidlink/web']],
  ['Server tests', npm, ['test', '-w', '@voidlink/server']],
  ['Media verification', npm, ['run', 'media:verify', '-w', '@voidlink/server']],
  ['Web build', npm, ['run', 'build', '-w', '@voidlink/web']],
];

function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed (${signal ?? `exit ${code}`})`));
    });
  });
}

async function startPostgres() {
  const child = spawn(process.execPath, ['apps/server/scripts/dev-db.mjs'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  let exited = null;
  child.once('exit', (code) => {
    exited = code;
  });

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`embedded PostgreSQL exited with code ${exited}`);
    if (await isListening(PORT)) return child;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  child.kill('SIGTERM');
  throw new Error(`embedded PostgreSQL did not start on port ${PORT} within 120s`);
}

function stopPostgres(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  // The server logs benign "terminating connection" errors while shutting down.
  child.stdout?.removeAllListeners('data');
  child.stderr?.removeAllListeners('data');
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 10_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function main() {
  let started = null;
  const results = [];

  try {
    if (await isListening(PORT)) {
      console.log(`[verify] reusing PostgreSQL on port ${PORT}`);
    } else {
      console.log(`[verify] starting embedded PostgreSQL on port ${PORT}`);
      started = await startPostgres();
    }
    console.log(`[verify] database ${DATABASE_URL}\n`);

    for (const [name, command, args] of steps) {
      const began = Date.now();
      console.log(`\n[verify] ▶ ${name}`);
      await run(command, args);
      const seconds = ((Date.now() - began) / 1000).toFixed(1);
      results.push([name, seconds]);
      console.log(`[verify] ✓ ${name} (${seconds}s)`);
    }
  } catch (error) {
    console.error(`\n[verify] ✗ ${error.message}`);
    for (const [name, seconds] of results) console.log(`[verify]   ✓ ${name} (${seconds}s)`);
    return 1;
  } finally {
    await stopPostgres(started);
  }

  console.log('\n[verify] all checks passed');
  for (const [name, seconds] of results) console.log(`[verify]   ✓ ${name} (${seconds}s)`);
  return 0;
}

process.exitCode = await main();
