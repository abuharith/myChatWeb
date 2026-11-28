import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const s3Port = 4569;
const bucket = 'voidlink-media';

// Must be set before the app modules read the environment.
process.env.NODE_ENV = 'test';
process.env.S3_ENDPOINT = `http://127.0.0.1:${s3Port}`;
process.env.S3_REGION = 'us-east-1';
process.env.S3_ACCESS_KEY_ID = 'S3RVER';
process.env.S3_SECRET_ACCESS_KEY = 'S3RVER';
process.env.S3_BUCKET = bucket;
// The sweep is invoked explicitly here, and grace windows are zero so the
// deletion rules are observable without waiting for wall-clock time.
process.env.MEDIA_SWEEP_DISABLED = 'true';
process.env.MEDIA_VIEW_ONCE_GRACE_SECONDS = '0';
process.env.MEDIA_ORPHAN_GRACE_SECONDS = '0';

const { default: S3rver } = await import('s3rver');
const { default: request } = await import('supertest');
const sharp = (await import('sharp')).default;
const { createApp } = await import('../src/app');
const { prisma } = await import('../src/lib/prisma');
const { sweepMediaLifecycle } = await import('../src/services/media-lifecycle.service');
const { headObject } = await import('../src/lib/storage');

const app = createApp();
const suffix = Math.random().toString(36).slice(2, 8);

const userA = {
  username: `sweep_a_${suffix}`,
  displayName: 'Sweep Ashka',
  email: `sweep_a_${suffix}@voidlink.test`,
  password: 'voidlink-test-pass',
};
const userB = {
  username: `sweep_b_${suffix}`,
  displayName: 'Sweep Rune',
  email: `sweep_b_${suffix}@voidlink.test`,
  password: 'voidlink-test-pass',
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let s3Server: { close: () => Promise<void> } | null = null;
let tokenA = '';
let tokenB = '';
let conversationId = '';
let messageId = '';
let attachmentId = '';
let storageKey = '';
let thumbnailKey = '';
let signedUrl = '';

describe('media sweep after message deletion', () => {
  beforeAll(async () => {
    const server = new S3rver({
      port: s3Port,
      address: '127.0.0.1',
      silent: true,
      directory: mkdtempSync(path.join(tmpdir(), 'voidlink-sweep-s3-')),
      configureBuckets: [{ name: bucket }],
      allowMismatchedSignatures: true,
    });
    await server.run();
    s3Server = server as unknown as { close: () => Promise<void> };

    await prisma.user.deleteMany({
      where: { username: { in: [userA.username, userB.username] } },
    });

    const a = await request(app).post('/v1/auth/register').send(userA).expect(201);
    const b = await request(app).post('/v1/auth/register').send(userB).expect(201);
    tokenA = a.body.data.accessToken;
    tokenB = b.body.data.accessToken;

    const conversation = await request(app)
      .post('/v1/conversations')
      .set(auth(tokenA))
      .send({ type: 'DIRECT', participantId: b.body.data.user.id })
      .expect(201);
    conversationId = conversation.body.data.conversation.id;

    const image = await sharp({
      create: { width: 320, height: 240, channels: 3, background: { r: 40, g: 120, b: 200 } },
    })
      .jpeg()
      .toBuffer();

    const presigned = await request(app)
      .post('/v1/uploads/presign')
      .set(auth(tokenA))
      .send({ kind: 'IMAGE', mimeType: 'image/jpeg', sizeBytes: image.length })
      .expect(201);
    const upload = await fetch(presigned.body.data.url, {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: image,
    });
    expect(upload.status).toBe(200);

    const completed = await request(app)
      .post(`/v1/uploads/${presigned.body.data.uploadId}/complete`)
      .set(auth(tokenA))
      .send({})
      .expect(200);
    attachmentId = completed.body.data.attachment.id;

    const sent = await request(app)
      .post(`/v1/conversations/${conversationId}/messages`)
      .set(auth(tokenA))
      .send({ clientId: crypto.randomUUID(), attachmentIds: [attachmentId], body: 'delete me' })
      .expect(201);
    messageId = sent.body.data.message.id;
    signedUrl = sent.body.data.message.attachments[0].url;

    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    storageKey = row.storageKey;
    thumbnailKey = row.thumbnailKey ?? '';
    expect(thumbnailKey).not.toBe('');
  }, 60_000);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { username: { in: [userA.username, userB.username] } },
    });
    await prisma.$disconnect();
    if (s3Server) await s3Server.close();
  });

  it('keeps the media and the issued URL when only a recipient deletes for me', async () => {
    await request(app)
      .delete(`/v1/messages/${messageId}`)
      .set(auth(tokenB))
      .send({ scope: 'me' })
      .expect(200);

    const sweep = await sweepMediaLifecycle();
    expect(sweep.failures).toBe(0);

    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    expect(row.purgedAt).toBeNull();

    // Both the original and its thumbnail are still in object storage.
    await expect(headObject(storageKey)).resolves.toBeTruthy();
    await expect(headObject(thumbnailKey)).resolves.toBeTruthy();

    // The URL already handed to clients keeps working.
    await request(app).get(signedUrl).expect(200);
  });

  it('purges the media and 404s the issued URL after delete for everyone', async () => {
    await request(app)
      .delete(`/v1/messages/${messageId}`)
      .set(auth(tokenA))
      .send({ scope: 'everyone' })
      .expect(200);

    const sweep = await sweepMediaLifecycle();
    expect(sweep.attachmentsPurged).toBeGreaterThanOrEqual(1);
    expect(sweep.objectsRemoved).toBeGreaterThanOrEqual(2);
    expect(sweep.failures).toBe(0);

    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    expect(row.purgedAt).toBeInstanceOf(Date);

    // The stored objects are gone, so the signed URL that was already issued
    // fails just like it did in the browser run.
    await expect(headObject(storageKey)).rejects.toBeTruthy();
    await expect(headObject(thumbnailKey)).rejects.toBeTruthy();

    const expired = await request(app).get(signedUrl);
    expect(expired.status).toBe(404);
    expect(expired.body.error.code).toBe('NOT_FOUND');
  });
});
