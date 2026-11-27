import type { SocketData } from '@voidlink/shared';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/tokens';
import { logger } from '../lib/logger';

/**
 * Structural handshake shape so the same middleware works for both namespaces
 * without fighting Socket.IO's per-namespace event generics.
 */
interface HandshakeLike {
  handshake: { auth?: Record<string, unknown> };
  data: SocketData;
}

/** Verifies the access token from the handshake and attaches identity to socket.data. */
export async function authenticateSocket(
  socket: HandshakeLike,
  next: (error?: Error & { data?: unknown }) => void,
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) throw new Error('missing token');

    const claims = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: { id: claims.sub, deletedAt: null },
      select: { id: true, username: true, displayName: true, bannedAt: true },
    });
    if (!user || user.bannedAt) throw new Error('invalid user');

    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.displayName = user.displayName;
    next();
  } catch (error) {
    logger.debug('socket auth rejected', { error: String(error) });
    next(new Error('unauthorized'));
  }
}
