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
