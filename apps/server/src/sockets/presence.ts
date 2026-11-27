import type { Namespace } from 'socket.io';
import type {
  PresenceClientEvents,
  PresenceServerEvents,
  SocketData,
} from '@voidlink/shared';
import { logger } from '../lib/logger';
import { rooms } from '../lib/realtime';
import * as presenceService from '../services/presence.service';
import { authenticateSocket } from './auth';

type PresenceServer = Namespace<
  PresenceClientEvents,
  PresenceServerEvents,
  Record<string, never>,
  SocketData
>;

export function attachPresence(io: PresenceServer): void {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(rooms.user(userId));

    void (async () => {
      try {
        await presenceService.connect(userId, socket.id);
        await presenceService.sendSnapshot(userId);
      } catch (error) {
        logger.warn('presence connect failed', { error: String(error) });
      }
    })();

    socket.on('presence:set', ({ status }) => {
      if (!['ONLINE', 'AWAY', 'DND'].includes(status)) return;
      void presenceService.setStatus(userId, status).catch((error) => {
        logger.warn('presence set failed', { error: String(error) });
      });
    });

    socket.on('disconnect', () => {
      void presenceService
        .disconnect(userId, socket.id)
        .catch((error) => logger.warn('presence disconnect failed', { error: String(error) }));
    });
  });
}
