import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { ensureBucket } from './lib/storage';
import { createSocketServers } from './sockets';

const app = createApp();
const httpServer = createServer(app);
createSocketServers(httpServer);

const storageReady = env.S3_EMBEDDED
  ? import('./lib/embedded-s3').then((module) => module.startEmbeddedS3()).then(() => ensureBucket())
  : ensureBucket();

void storageReady.catch((error) =>
  logger.warn('media bucket unavailable; uploads will fail until storage is reachable', {
    error: error instanceof Error ? error.message : String(error),
  }),
);

httpServer.listen(env.PORT, '0.0.0.0', () => {
  logger.info('VoidLink API listening', {
    port: env.PORT,
    env: env.NODE_ENV,
    webOrigin: env.WEB_ORIGIN,
    redis: Boolean(env.REDIS_URL),
  });
});

const shutdown = async (signal: string) => {
  logger.info('shutting down', { signal });
  httpServer.close();
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection', { reason: String(reason) });
});
