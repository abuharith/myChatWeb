import type { Presence, PresenceUpdate } from '@voidlink/shared';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { findConversationPartnerIds } from '../repositories/users.repo';
import { emitPresence, emitPresenceSnapshot } from '../lib/realtime';

interface Entry {
  sockets: Set<string>;
  status: Exclude<Presence, 'OFFLINE'>;
  lastSeenAt: Date | null;
  manual: boolean;
}

const entries = new Map<string, Entry>();
const audienceCache = new Map<string, { ids: string[]; expiresAt: number }>();

const AUDIENCE_TTL_MS = 30_000;

function entryFor(userId: string): Entry {
  let entry = entries.get(userId);
  if (!entry) {
    entry = { sockets: new Set(), status: 'ONLINE', lastSeenAt: null, manual: false };
    entries.set(userId, entry);
  }
  return entry;
}

export function snapshotOf(userId: string): PresenceUpdate {
  const entry = entries.get(userId);
  if (!entry || entry.sockets.size === 0) {
    return { userId, presence: 'OFFLINE', lastSeenAt: entry?.lastSeenAt?.toISOString() ?? null };
  }
  return {
    userId,
    presence: entry.status,
    lastSeenAt: entry.lastSeenAt?.toISOString() ?? null,
  };
}

async function audience(userId: string): Promise<string[]> {
  const cached = audienceCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.ids;
  const ids = await findConversationPartnerIds(userId);
  audienceCache.set(userId, { ids, expiresAt: Date.now() + AUDIENCE_TTL_MS });
  return ids;
}

/** Called when a socket opens. The first socket wins; later sockets keep status. */
export async function connect(userId: string, socketId: string): Promise<PresenceUpdate> {
  const entry = entryFor(userId);
  const wasOffline = entry.sockets.size === 0;
  entry.sockets.add(socketId);
  if (wasOffline) {
    entry.status = 'ONLINE';
    entry.manual = false;
  }

  void prisma.user
    .update({ where: { id: userId }, data: { presence: entry.status, lastSeenAt: new Date() } })
    .catch((error) => logger.warn('presence write failed', { error: String(error) }));

  const update = snapshotOf(userId);
  if (wasOffline) emitPresence(await audience(userId), update);
  return update;
}

export async function setStatus(
  userId: string,
  status: 'ONLINE' | 'AWAY' | 'DND',
): Promise<PresenceUpdate> {
  const entry = entryFor(userId);
  entry.status = status;
  entry.manual = status !== 'ONLINE';
  void prisma.user
    .update({ where: { id: userId }, data: { presence: status } })
    .catch((error) => logger.warn('presence write failed', { error: String(error) }));
  const update = snapshotOf(userId);
  emitPresence(await audience(userId), update);
  return update;
}

export async function disconnect(
  userId: string,
  socketId: string,
): Promise<{ wentOffline: boolean; update: PresenceUpdate }> {
  const entry = entryFor(userId);
  entry.sockets.delete(socketId);

  if (entry.sockets.size > 0) {
    return { wentOffline: false, update: snapshotOf(userId) };
  }

  entry.lastSeenAt = new Date();
  const update = snapshotOf(userId);
  emitPresence(await audience(userId), update);

  await prisma.user
    .update({ where: { id: userId }, data: { presence: 'OFFLINE', lastSeenAt: entry.lastSeenAt } })
    .catch((error) => logger.warn('presence write failed', { error: String(error) }));

  // Keep the lastSeen for a while so reconnects render a sensible value.
  setTimeout(() => {
    const current = entries.get(userId);
    if (current && current.sockets.size === 0) entries.delete(userId);
  }, 5 * 60_000).unref?.();

  return { wentOffline: true, update };
}

export async function snapshotFor(userId: string): Promise<PresenceUpdate[]> {
  const ids = await audience(userId);
  return ids.map((id) => snapshotOf(id));
}

export async function sendSnapshot(userId: string): Promise<void> {
  emitPresenceSnapshot(userId, await snapshotFor(userId));
}

export function isOnline(userId: string): boolean {
  const entry = entries.get(userId);
  return Boolean(entry && entry.sockets.size > 0);
}

/** Called when a new conversation is created so audience caches refresh. */
export function invalidateAudience(...userIds: string[]): void {
  for (const userId of userIds) audienceCache.delete(userId);
}
