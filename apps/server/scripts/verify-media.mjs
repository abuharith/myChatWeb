/**
 * End-to-end media verification against a real S3 API (s3rver), real sharp
 * processing and real FFmpeg, through the actual Express app.
 *
 *   S3_EMBEDDED=false npx tsx scripts/verify-media.ts   (self-contained)
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

process.env.NODE_ENV = 'test';
process.env.S3_ENDPOINT = 'http://127.0.0.1:4568';
process.env.S3_REGION = 'us-east-1';
process.env.S3_ACCESS_KEY_ID = 'S3RVER';
process.env.S3_SECRET_ACCESS_KEY = 'S3RVER';
process.env.S3_BUCKET = 'voidlink-media';
process.env.FFMPEG_PATH = ffmpegPath;
process.env.FFPROBE_PATH = ffprobePath;
// The lifecycle sweep is invoked explicitly here; grace windows are zero so the
// burn/deletion rules are observable without waiting for wall-clock time.
process.env.MEDIA_SWEEP_DISABLED = 'true';
process.env.MEDIA_VIEW_ONCE_GRACE_SECONDS = '0';
process.env.MEDIA_ORPHAN_GRACE_SECONDS = '0';

const { default: S3rver } = await import('s3rver');
const request = (await import('supertest')).default;
const sharp = (await import('sharp')).default;
const { createApp } = await import('../src/app.ts');
const { prisma } = await import('../src/lib/prisma.ts');

const bucket = 'voidlink-media';
const s3Server = new S3rver({
  port: 4568,
  address: '127.0.0.1',
  silent: true,
  directory: mkdtempSync(path.join(tmpdir(), 'voidlink-s3-')),
  configureBuckets: [{ name: bucket }],
  allowMismatchedSignatures: true,
});
await s3Server.run();

const app = createApp();
const suffix = Math.random().toString(36).slice(2, 8);
const pass = (label) => console.log(`PASS ${label}`);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const users = [
  { username: `media_a_${suffix}`, displayName: 'Media Ashka', email: `media_a_${suffix}@voidlink.test`, password: 'voidlink-test-pass' },
  { username: `media_b_${suffix}`, displayName: 'Media Rune', email: `media_b_${suffix}@voidlink.test`, password: 'voidlink-test-pass' },
];

async function putToPresignedUrl(presigned, bytes, contentType) {
  const response = await fetch(presigned.url, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: bytes,
  });
  assert.equal(response.status, 200, `presigned PUT failed: ${response.status}`);
}

async function uploadAs(token, kind, mimeType, bytes, extra = {}) {
  const presigned = await request(app)
    .post('/v1/uploads/presign')
    .set(bearer(token))
    .send({ kind, mimeType, sizeBytes: bytes.length, ...extra })
    .expect(201);
  await putToPresignedUrl(presigned.body.data, bytes, mimeType);
  const completed = await request(app)
    .post(`/v1/uploads/${presigned.body.data.uploadId}/complete`)
    .set(bearer(token))
    .send(extra)
    .expect(200);
  return completed.body.data.attachment;
}

function sineWav(seconds = 0.6, rate = 8000) {
  const samples = Math.floor(seconds * rate);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i += 1) {
    const value = Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 0.3 * 32767);
    buffer.writeInt16LE(value, 44 + i * 2);
  }
  return buffer;
}

try {
  const [a, b] = await Promise.all(
    users.map((user) => request(app).post('/v1/auth/register').send(user).expect(201)),
  );
  const tokenA = a.body.data.accessToken;
  const tokenB = b.body.data.accessToken;
  const userBId = b.body.data.user.id;
  pass('two accounts registered');

  const conversation = await request(app)
    .post('/v1/conversations')
    .set(bearer(tokenA))
    .send({ type: 'DIRECT', participantId: userBId })
    .expect(201);
  const conversationId = conversation.body.data.conversation.id;

  // A JPEG carrying EXIF metadata and an orientation tag.
  const originalImage = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 80, g: 20, b: 140 } },
  })
    .jpeg({ quality: 92 })
    .withMetadata({ exif: { IFD0: { ImageDescription: 'GPS 51.5,-0.12 secret' } }, orientation: 6 })
    .toBuffer();
  const originalMeta = await sharp(originalImage).metadata();
  assert.ok(originalMeta.exif && originalMeta.exif.length > 0, 'fixture must carry EXIF');

  const image = await uploadAs(tokenA, 'IMAGE', 'image/jpeg', originalImage);
  assert.equal(image.kind, 'IMAGE');
  // 2400x1600 with orientation 6 becomes portrait, then the long edge is capped at 2048.
  assert.equal(image.height, 2048);
  assert.equal(image.width, 1365);
  assert.ok(image.width < image.height, 'orientation was not applied');
  assert.ok(image.blurhash && image.blurhash.length > 10, 'blurhash missing');
  assert.ok(image.thumbnailUrl, 'thumbnail missing');
  assert.ok(image.url, 'media url missing');
  pass('image normalized, thumbnail + blurhash generated');

  const full = await request(app).get(image.url).expect(200);
  assert.match(full.headers['content-type'], /image\/jpeg/);
  const processedMeta = await sharp(full.body).metadata();
  assert.equal(processedMeta.exif, undefined, 'EXIF survived normalization');
  assert.ok((processedMeta.width ?? 0) <= 2048 && (processedMeta.height ?? 0) <= 2048);
  pass('EXIF stripped and dimensions capped at 2048');

  const thumb = await request(app).get(image.thumbnailUrl).expect(200);
  const thumbMeta = await sharp(thumb.body).metadata();
  assert.ok((thumbMeta.width ?? 0) <= 480 && (thumbMeta.height ?? 0) <= 480);
  pass('thumbnail streamed at <=480px');

  const sent = await request(app)
    .post(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenA))
    .send({ clientId: crypto.randomUUID(), attachmentIds: [image.id], body: '' })
    .expect(201);
  assert.equal(sent.body.data.message.type, 'IMAGE');
  assert.equal(sent.body.data.message.attachments.length, 1);
  const imageMessageId = sent.body.data.message.id;

  const recipientPage = await request(app)
    .get(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenB))
    .expect(200);
  const received = recipientPage.body.data.messages.find((message) => message.id === imageMessageId);
  assert.ok(received.attachments[0].url, 'recipient did not receive a media url');
  await request(app).get(received.attachments[0].url).expect(200);
  pass('attachment linked to message and delivered to the recipient');

  // Signed URLs expire; a member of the conversation must be able to re-sign
  // them without reloading the whole message history.
  const { mediaUrl } = await import('../src/lib/media-signing.ts');
  const expired = await request(app).get(mediaUrl(image.id, 'full', -60)).expect(401);
  assert.equal(expired.body.error.code, 'MEDIA_TOKEN_INVALID');

  const refreshed = await request(app)
    .get(`/v1/attachments/${image.id}/url`)
    .set(bearer(tokenB))
    .expect(200);
  assert.ok(refreshed.body.data.url);
  assert.match(refreshed.body.data.url, /token=/);
  assert.ok(refreshed.body.data.thumbnailUrl);
  await request(app).get(refreshed.body.data.url).expect(200);
  await request(app).get(refreshed.body.data.thumbnailUrl).expect(200);

  const outsider = await request(app)
    .post('/v1/auth/register')
    .send({
      username: `media_c_${suffix}`,
      displayName: 'Media Sable',
      email: `media_c_${suffix}@voidlink.test`,
      password: 'voidlink-test-pass',
    })
    .expect(201);
  await request(app)
    .get(`/v1/attachments/${image.id}/url`)
    .set(bearer(outsider.body.data.accessToken))
    .expect(403);
  pass('expired URLs re-sign for members only');

  await request(app)
    .post(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenB))
    .send({ clientId: crypto.randomUUID(), attachmentIds: [image.id], body: '' })
    .expect(409);
  pass('another account cannot reuse the attachment');

  const voiceBytes = sineWav();
  const voice = await uploadAs(tokenA, 'VOICE', 'audio/wav', voiceBytes, {
    durationMs: 600,
    waveform: [0, 0.4, 0.9, 0.2],
  });
  assert.equal(voice.durationMs, 600);
  assert.deepEqual(voice.waveform, [0, 0.4, 0.9, 0.2]);
  const voiceMessage = await request(app)
    .post(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenA))
    .send({ clientId: crypto.randomUUID(), attachmentIds: [voice.id], body: '' })
    .expect(201);
  assert.equal(voiceMessage.body.data.message.type, 'VOICE');
  const voiceAudio = await request(app).get(voice.url).expect(200);
  assert.equal(voiceAudio.body.length, voiceBytes.length);
  pass('voice note stored with waveform and streamed intact');

  const videoDir = mkdtempSync(path.join(tmpdir(), 'voidlink-fixture-'));
  const videoFile = path.join(videoDir, 'clip.mp4');
  execFileSync(ffmpegPath, [
    '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=20', '-t', '1',
    '-pix_fmt', 'yuv420p', '-y', videoFile,
  ]);
  const videoBytes = (await import('node:fs')).readFileSync(videoFile);
  const video = await uploadAs(tokenA, 'VIDEO', 'video/mp4', videoBytes);
  assert.ok(video.durationMs && video.durationMs >= 900, `video duration wrong: ${video.durationMs}`);
  assert.ok(video.thumbnailUrl, 'video thumbnail missing');
  assert.ok(video.blurhash, 'video blurhash missing');
  await request(app).get(video.thumbnailUrl).expect(200);
  pass('video probed, frame extracted, thumbnail + blurhash generated');

  const once = await uploadAs(tokenA, 'IMAGE', 'image/jpeg', originalImage);
  const onceMessage = await request(app)
    .post(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenA))
    .send({ clientId: crypto.randomUUID(), attachmentIds: [once.id], body: '', viewOnce: true })
    .expect(201);
  assert.equal(onceMessage.body.data.message.viewOnce, true);
  assert.equal(onceMessage.body.data.message.attachments[0].url, null);
  await request(app)
    .get(`/v1/attachments/${once.id}/url`)
    .set(bearer(tokenB))
    .expect(400);
  pass('view-once media cannot be re-signed');

  const opened = await request(app)
    .post(`/v1/attachments/${once.id}/view`)
    .set(bearer(tokenB))
    .expect(200);
  await request(app).get(opened.body.data.url).expect(200);
  const again = await request(app)
    .post(`/v1/attachments/${once.id}/view`)
    .set(bearer(tokenB))
    .expect(410);
  assert.equal(again.body.error.code, 'ATTACHMENT_VIEWED');
  pass('view-once burned after first open and cannot reopen');

  // ── media lifecycle: burned and deleted media leave object storage ──────
  const { sweepMediaLifecycle } = await import('../src/services/media-lifecycle.service.ts');
  const { headObject } = await import('../src/lib/storage.ts');
  const missing = async (key) => {
    await assert.rejects(() => headObject(key), undefined, `object ${key} still exists`);
  };
  const attachmentRow = (id) => prisma.attachment.findUnique({ where: { id } });

  const onceRow = await attachmentRow(once.id);
  await headObject(onceRow.storageKey); // readable during the delivery grace window
  const burned = await sweepMediaLifecycle();
  assert.ok(burned.attachmentsPurged >= 1, 'sweep did not purge the burned view-once');
  await missing(onceRow.storageKey);
  await missing(onceRow.thumbnailKey);
  const burnedRow = await attachmentRow(once.id);
  assert.ok(burnedRow.purgedAt, 'burned attachment was not marked purged');
  // The token is still within its TTL, but the row is already tombstoned.
  await request(app).get(opened.body.data.url).expect(404);
  const afterBurn = await sweepMediaLifecycle();
  assert.equal(afterBurn.attachmentsPurged, 0, 'sweep purged the same attachment twice');
  pass('view-once burn deletes the stored object after delivery and stops streaming');

  const doomed = await uploadAs(tokenA, 'IMAGE', 'image/jpeg', originalImage);
  const doomedRow = await attachmentRow(doomed.id);
  const doomedMessage = await request(app)
    .post(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenA))
    .send({ clientId: crypto.randomUUID(), attachmentIds: [doomed.id], body: 'delete me' })
    .expect(201);
  const doomedId = doomedMessage.body.data.message.id;
  const deletePath = `/v1/messages/${doomedId}`;

  // Only the sender may tombstone a message for the whole conversation.
  await request(app)
    .delete(deletePath)
    .set(bearer(tokenB))
    .send({ scope: 'everyone' })
    .expect(403);
  await request(app)
    .delete(deletePath)
    .set(bearer(outsider.body.data.accessToken))
    .send({ scope: 'me' })
    .expect(403);
  pass('only participants can delete, and only the sender can delete for everyone');

  // Delete-for-me hides the message from the caller only; the media stays
  // because the other participant still has it.
  await request(app).delete(deletePath).set(bearer(tokenB)).send({ scope: 'me' }).expect(200);
  const bHistory = await request(app)
    .get(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenB))
    .expect(200);
  assert.ok(
    !bHistory.body.data.messages.some((message) => message.id === doomedId),
    'delete-for-me left the message in the caller history',
  );
  const aHistory = await request(app)
    .get(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenA))
    .expect(200);
  assert.ok(
    aHistory.body.data.messages.some((message) => message.id === doomedId),
    'delete-for-me hid the message for another participant',
  );
  await headObject(doomedRow.storageKey);
  pass('delete-for-me hides the message for one account without deleting media');

  const deleted = await request(app)
    .delete(deletePath)
    .set(bearer(tokenA))
    .send({ scope: 'everyone' })
    .expect(200);
  assert.equal(deleted.body.data.scope, 'everyone');
  assert.equal(deleted.body.data.message.deletedForEveryone, true);
  assert.equal(deleted.body.data.message.body, null);
  assert.deepEqual(deleted.body.data.message.attachments, []);

  const deletedSweep = await sweepMediaLifecycle();
  assert.ok(deletedSweep.attachmentsPurged >= 1, 'sweep did not purge deleted message media');
  await missing(doomedRow.storageKey);
  await missing(doomedRow.thumbnailKey);
  assert.ok((await attachmentRow(doomed.id)).purgedAt, 'deleted attachment was not marked purged');
  const deletedHistory = await request(app)
    .get(`/v1/conversations/${conversationId}/messages`)
    .set(bearer(tokenA))
    .expect(200);
  const deletedView = deletedHistory.body.data.messages.find((message) => message.id === doomedId);
  assert.equal(deletedView.deletedForEveryone, true);
  assert.equal(deletedView.body, null);
  assert.deepEqual(deletedView.attachments, []);
  pass('delete-for-everyone tombstones the message and the sweep removes its media');

  const orphan = await uploadAs(tokenA, 'IMAGE', 'image/jpeg', originalImage);
  const orphanRow = await attachmentRow(orphan.id);
  await prisma.attachment.update({
    where: { id: orphan.id },
    data: { createdAt: new Date(Date.now() - 60_000) },
  });
  const orphanSweep = await sweepMediaLifecycle();
  assert.ok(orphanSweep.attachmentsPurged >= 1, 'sweep did not reclaim the never-sent attachment');
  await missing(orphanRow.storageKey);
  assert.equal(await attachmentRow(orphan.id), null, 'orphan attachment row survived');
  pass('never-sent attachment and its upload row are reclaimed');

  const abandoned = await request(app)
    .post('/v1/uploads/presign')
    .set(bearer(tokenA))
    .send({ kind: 'FILE', mimeType: 'text/plain', sizeBytes: 12 })
    .expect(201);
  await putToPresignedUrl(
    abandoned.body.data,
    Buffer.from('abandoned!!!'),
    'text/plain',
  );
  await prisma.upload.update({
    where: { id: abandoned.body.data.uploadId },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  const uploadSweep = await sweepMediaLifecycle();
  assert.ok(uploadSweep.uploadsExpired >= 1, 'sweep did not expire the abandoned upload');
  await missing(abandoned.body.data.key);
  const expiredRow = await prisma.upload.findUnique({
    where: { id: abandoned.body.data.uploadId },
  });
  assert.equal(expiredRow.status, 'EXPIRED');
  pass('abandoned presigned uploads are deleted and marked EXPIRED');

  await request(app).get(image.url).expect(200);
  assert.equal((await attachmentRow(image.id)).purgedAt, null);
  pass('live attachments survive the sweep');

  await request(app)
    .post('/v1/uploads/presign')
    .set(bearer(tokenA))
    .send({ kind: 'IMAGE', mimeType: 'image/svg+xml', sizeBytes: 100 })
    .expect(400);
  await request(app)
    .post('/v1/uploads/presign')
    .set(bearer(tokenA))
    .send({ kind: 'IMAGE', mimeType: 'image/png', sizeBytes: 16 * 1024 * 1024 })
    .expect(400);
  const badToken = await request(app)
    .get(image.url.replace(/token=[^&]+/, 'token=forged'))
    .expect(401);
  assert.equal(badToken.body.error.code, 'MEDIA_TOKEN_INVALID');
  pass('unsupported types, oversize files and forged media tokens rejected');

  // Upload must belong to the account that declared it.
  const otherUpload = await request(app)
    .post('/v1/uploads/presign')
    .set(bearer(tokenB))
    .send({ kind: 'IMAGE', mimeType: 'image/jpeg', sizeBytes: originalImage.length })
    .expect(201);
  await request(app)
    .post(`/v1/uploads/${otherUpload.body.data.uploadId}/complete`)
    .set(bearer(tokenA))
    .send({})
    .expect(404);
  pass('uploads are scoped to their owner');

  console.log('\nALL MEDIA CHECKS PASSED');
} finally {
  await prisma.user.deleteMany({
    where: {
      username: {
        in: [...users.map((user) => user.username), `media_c_${suffix}`],
      },
    },
  });
  await prisma.$disconnect();
  await s3Server.close();
}
