import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { createSocketServers } from './sockets';

const app = createApp();
const httpServer = createServer(app);
createSocketServers(httpServer);

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
