/**
 * Unread-count transitions.
 *
 * Badges are optimistic, so every transition has to be idempotent and
 * replayable: the same socket message can arrive twice (reconnect, duplicate
 * emit), and a conversation-list fetch in flight must not clobber an increment
 * that happened after it started.
 *
 * Rules:
 *  - own messages never count;
 *  - a message only counts once per session (dedupe by id);
 *  - reading a conversation always yields 0;
 *  - a server response is authoritative for everything that happened before the
 *    request, and local events after `sinceEpoch` are replayed on top.
 */

export interface UnreadEvent {
  conversationId: string;
  epoch: number;
  kind: 'increment' | 'read';
}

export function nextUnread(input: {
  current: number;
  isOwn: boolean;
  isReading: boolean;
  alreadySeen: boolean;
}): number {
  const { current, isOwn, isReading, alreadySeen } = input;
  if (isOwn || alreadySeen) return Math.max(0, current);
  if (isReading) return 0;
  return Math.max(0, current) + 1;
}

/** Apply local events that happened after the server request began. */
export function replayUnread(
  serverCounts: Record<string, number>,
  events: UnreadEvent[],
  sinceEpoch: number,
): Record<string, number> {
  const counts: Record<string, number> = { ...serverCounts };

  const pending = events
    .filter((event) => event.epoch > sinceEpoch)
    .sort((a, b) => a.epoch - b.epoch);

  for (const event of pending) {
    if (event.kind === 'read') {
      counts[event.conversationId] = 0;
    } else {
      counts[event.conversationId] = (counts[event.conversationId] ?? 0) + 1;
    }
  }

  return counts;
}

export function badgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? '99+' : String(Math.trunc(count));
}
