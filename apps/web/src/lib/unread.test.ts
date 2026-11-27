import { describe, expect, it } from 'vitest';
import { badgeLabel, nextUnread, replayUnread, type UnreadEvent } from './unread';

const base = { current: 2, isOwn: false, isReading: false, alreadySeen: false };

describe('nextUnread', () => {
  it('increments once for a new incoming message', () => {
    expect(nextUnread(base)).toBe(3);
  });

  it('never increments for your own message', () => {
    expect(nextUnread({ ...base, isOwn: true })).toBe(2);
  });

  it('never increments the same message twice', () => {
    expect(nextUnread({ ...base, alreadySeen: true })).toBe(2);
  });

  it('resets to zero while the conversation is being read', () => {
    expect(nextUnread({ ...base, current: 7, isReading: true })).toBe(0);
  });

  it('never goes negative after a read followed by the same message', () => {
    expect(nextUnread({ current: 0, isOwn: false, isReading: false, alreadySeen: true })).toBe(0);
  });
});

describe('replayUnread', () => {
  const events: UnreadEvent[] = [
    { conversationId: 'a', epoch: 1, kind: 'increment' },
    { conversationId: 'a', epoch: 2, kind: 'increment' },
    { conversationId: 'b', epoch: 3, kind: 'read' },
    { conversationId: 'a', epoch: 4, kind: 'read' },
    { conversationId: 'a', epoch: 5, kind: 'increment' },
  ];

  it('trusts the server for events before the request started', () => {
    const counts = replayUnread({ a: 2, b: 4 }, events, 5);
    expect(counts).toEqual({ a: 2, b: 4 });
  });

  it('replays a read that raced the request, then later increments', () => {
    const counts = replayUnread({ a: 2, b: 0 }, events, 1);
    expect(counts).toEqual({ a: 1, b: 0 });
  });

  it('applies only the events after the request epoch', () => {
    const counts = replayUnread({ a: 9, b: 3 }, events, 3);
    expect(counts).toEqual({ a: 1, b: 3 });
  });

  it('preserves server counts for conversations with no local events', () => {
    const counts = replayUnread({ a: 1, b: 1, c: 5 }, events, 0);
    expect(counts.c).toBe(5);
  });
});

describe('badgeLabel', () => {
  it('hides zero and negative counts', () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(-3)).toBeNull();
  });

  it('caps at 99+', () => {
    expect(badgeLabel(7)).toBe('7');
    expect(badgeLabel(99)).toBe('99');
    expect(badgeLabel(100)).toBe('99+');
  });
});
