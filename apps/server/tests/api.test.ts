import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();
const suffix = Math.random().toString(36).slice(2, 8);

const userA = {
  username: `test_a_${suffix}`,
  displayName: 'Test Ashka',
  email: `test_a_${suffix}@voidlink.test`,
  password: 'voidlink-test-pass',
};
const userB = {
  username: `test_b_${suffix}`,
  displayName: 'Test Rune',
  email: `test_b_${suffix}@voidlink.test`,
  password: 'voidlink-test-pass',
};

const cookieOf = (response: request.Response): string => {
  const raw = response.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = list.find((entry: string) => entry.startsWith('voidlink_rt='));
  if (!cookie) throw new Error('refresh cookie missing');
  return cookie.split(';')[0] ?? '';
};

let tokenA = '';
let tokenB = '';
let userBId = '';
let conversationId = '';
let messageId = '';
const clientId = crypto.randomUUID();

describe('auth + messaging core', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { username: { in: [userA.username, userB.username] } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { username: { in: [userA.username, userB.username] } },
    });
    await prisma.$disconnect();
  });

  it('registers two accounts and rejects a duplicate email', async () => {
    const first = await request(app).post('/v1/auth/register').send(userA).expect(201);
    expect(first.body.data.accessToken).toBeTypeOf('string');
    expect(first.body.data.user.username).toBe(userA.username);
    expect(cookieOf(first)).toContain('voidlink_rt=');
    tokenA = first.body.data.accessToken;

    const second = await request(app).post('/v1/auth/register').send(userB).expect(201);
    tokenB = second.body.data.accessToken;
    userBId = second.body.data.user.id;

    const duplicate = await request(app).post('/v1/auth/register').send(userA).expect(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('rejects bad credentials and unauthenticated reads', async () => {
    await request(app)
      .post('/v1/auth/login')
      .send({ identifier: userA.username, password: 'wrong-password' })
      .expect(401);

    await request(app).get('/v1/conversations').expect(401);
  });

  it('logs in and returns the current user', async () => {
    const login = await request(app)
      .post('/v1/auth/login')
      .send({ identifier: userA.email, password: userA.password })
      .expect(200);
    tokenA = login.body.data.accessToken;

    const me = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(me.body.data.user.email).toBe(userA.email);
    expect(me.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('creates an idempotent direct conversation', async () => {
    const created = await request(app)
      .post('/v1/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'DIRECT', participantId: userBId })
      .expect(201);

    conversationId = created.body.data.conversation.id;
    expect(created.body.data.conversation.peer.id).toBe(userBId);

    const again = await request(app)
      .post('/v1/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'DIRECT', participantId: userBId })
      .expect(200);
    expect(again.body.data.conversation.id).toBe(conversationId);
  });

  it('sends a message, deduplicates the client id, and maps receipts to read', async () => {
    const sent = await request(app)
      .post(`/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ clientId, type: 'TEXT', body: 'The monolith answers.' })
      .expect(201);

    messageId = sent.body.data.message.id;
    expect(sent.body.data.message.status).toBe('SENT');

    const replay = await request(app)
      .post(`/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ clientId, type: 'TEXT', body: 'The monolith answers.' })
      .expect(200);
    expect(replay.body.data.message.id).toBe(messageId);

    const pageB = await request(app)
      .get(`/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(pageB.body.data.messages).toHaveLength(1);
    expect(pageB.body.data.messages[0].sender.username).toBe(userA.username);

    const read = await request(app)
      .post(`/v1/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ messageIds: [messageId] })
      .expect(200);
    expect(read.body.data.messageIds).toEqual([messageId]);

    const pageA = await request(app)
      .get(`/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(pageA.body.data.messages[0].status).toBe('READ');

    const list = await request(app)
      .get('/v1/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(list.body.data.conversations[0].lastMessage.body).toBe('The monolith answers.');
  });

  it('only lets the sender delete for everyone and leaves a tombstone', async () => {
    const denied = await request(app)
      .delete(`/v1/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ scope: 'everyone' })
      .expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');

    const deleted = await request(app)
      .delete(`/v1/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scope: 'everyone' })
      .expect(200);

    expect(deleted.body.data).toMatchObject({ conversationId, messageId, scope: 'everyone' });
    expect(deleted.body.data.message).toMatchObject({
      id: messageId,
      body: null,
      deletedForEveryone: true,
      attachments: [],
    });

    // Both sides keep the row as a tombstone, with no text or media metadata.
    for (const token of [tokenA, tokenB]) {
      const page = await request(app)
        .get(`/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(page.body.data.messages).toHaveLength(1);
      expect(page.body.data.messages[0]).toMatchObject({
        id: messageId,
        body: null,
        deletedForEveryone: true,
        attachments: [],
      });
    }

    const row = await prisma.message.findUnique({ where: { id: messageId } });
    expect(row?.body).toBeNull();
    expect(row?.deletedForEveryone).toBe(true);
    expect(row?.deletedAt).toBeInstanceOf(Date);

    // Repeating the delete is a no-op that still returns the tombstone.
    const again = await request(app)
      .delete(`/v1/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scope: 'everyone' })
      .expect(200);
    expect(again.body.data.message.body).toBeNull();
  });

  it('hides a message for one account only when deleting for me', async () => {
    const second = await request(app)
      .post(`/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ clientId: crypto.randomUUID(), type: 'TEXT', body: 'Only for now.' })
      .expect(201);
    const secondId = second.body.data.message.id as string;

    const hidden = await request(app)
      .delete(`/v1/messages/${secondId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ scope: 'me' })
      .expect(200);
    expect(hidden.body.data).toMatchObject({
      conversationId,
      messageId: secondId,
      scope: 'me',
      message: null,
    });

    // The recipient no longer sees the message; only the older tombstone remains.
    const pageB = await request(app)
      .get(`/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(pageB.body.data.messages.map((message: { id: string }) => message.id)).toEqual([
      messageId,
    ]);

    // The sender still sees it untouched, and it is not a tombstone.
    const pageA = await request(app)
      .get(`/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(pageA.body.data.messages).toHaveLength(2);
    expect(pageA.body.data.messages[1]).toMatchObject({
      id: secondId,
      body: 'Only for now.',
      deletedForEveryone: false,
    });

    const row = await prisma.message.findUnique({
      where: { id: secondId },
      include: { hides: true },
    });
    expect(row?.deletedForEveryone).toBe(false);
    expect(row?.hides.map((hide) => hide.userId)).toEqual([userBId]);

    // Hiding twice is idempotent rather than a conflict.
    await request(app)
      .delete(`/v1/messages/${secondId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ scope: 'me' })
      .expect(200);
  });

  it('rejects deletes for missing messages and invalid scopes', async () => {
    const missing = await request(app)
      .delete('/v1/messages/does-not-exist')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scope: 'me' })
      .expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    await request(app)
      .delete(`/v1/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scope: 'everybody' })
      .expect(400);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const login = await request(app)
      .post('/v1/auth/login')
      .send({ identifier: userA.username, password: userA.password })
      .expect(200);
    const firstCookie = cookieOf(login);

    const rotated = await request(app)
      .post('/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(200);
    expect(rotated.body.data.accessToken).toBeTypeOf('string');
    expect(cookieOf(rotated)).not.toBe(firstCookie);

    // Replaying the rotated-away token must fail and revoke the family.
    await request(app).post('/v1/auth/refresh').set('Cookie', firstCookie).expect(401);
  });

  it('refuses to message yourself and unknown conversations', async () => {
    const me = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    await request(app)
      .post('/v1/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'DIRECT', participantId: me.body.data.user.id })
      .expect(400);

    await request(app)
      .get('/v1/conversations/does-not-exist/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });
});
