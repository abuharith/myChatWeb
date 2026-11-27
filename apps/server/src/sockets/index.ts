import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { Namespace } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type {
  ChatClientEvents,
  ChatServerEvents,
  PresenceClientEvents,
  PresenceServerEvents,
  SocketData,
} from '@voidlink/shared';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { registerRealtime } from '../lib/realtime';
import { attachChat } from './chat';
import { attachPresence } from './presence';

type ChatNamespace = Namespace<
  ChatClientEvents,
  ChatServerEvents,
  Record<string, never>,
  SocketData
>;
type PresenceNamespace = Namespace<
  PresenceClientEvents,
  PresenceServerEvents,
  Record<string, never>,
  SocketData
>;

export function createSocketServers(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    serveClient: false,
    pingTimeout: 25_000,
  });

  if (env.REDIS_URL) {
    try {
      const pub = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
      const sub = pub.duplicate();
      io.adapter(createAdapter(pub, sub));
      logger.info('socket.io redis adapter enabled');
    } catch (error) {
      logger.warn('redis adapter unavailable, running single-node', { error: String(error) });
    }
  }

  // Namespaces must be created explicitly; a Server alone only serves "/".
  const chat = io.of('/chat') as unknown as ChatNamespace;
  const presence = io.of('/presence') as unknown as PresenceNamespace;

  attachChat(chat);
  attachPresence(presence);
  registerRealtime(chat, presence);

  return { io, chat, presence };
}
