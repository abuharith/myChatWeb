import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';
import {
  LIMITS,
  completeUploadSchema,
  presignUploadSchema,
  type AttachmentKind,
  type AttachmentUrlsDTO,
  type CompletedUploadDTO,
  type OpenViewOnceDTO,
  type PresignedUploadDTO,
} from '@voidlink/shared';
import { env } from '../config/env';
import { AppError, badRequest, forbidden, notFound } from '../lib/errors';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { verifyMediaToken, mediaUrl } from '../lib/media-signing';
import {
  downloadObject,
  getObjectBytes,
  headObject,
  mediaBucket,
  presignPut,
  putObject,
} from '../lib/storage';
import { toAttachmentDTO } from './dto';

const run = promisify(execFile);

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/aac',
]);
const FILE_MIMES = new Set(['application/pdf', 'text/plain', 'application/zip']);

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/webm': 'weba',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/zip': 'zip',
};

const MAX_BYTES: Record<AttachmentKind, number> = {
  IMAGE: LIMITS.media.imageMaxBytes,
  VIDEO: LIMITS.media.videoMaxBytes,
  AUDIO: LIMITS.media.audioMaxBytes,
  VOICE: LIMITS.media.voiceMaxBytes,
  FILE: LIMITS.media.fileMaxBytes,
};

function assertAllowed(kind: AttachmentKind, mimeType: string, sizeBytes: number): void {
  const allowedMimes =
    kind === 'IMAGE'
      ? IMAGE_MIMES
      : kind === 'VIDEO'
        ? VIDEO_MIMES
        : kind === 'AUDIO' || kind === 'VOICE'
          ? AUDIO_MIMES
          : FILE_MIMES;

  if (!allowedMimes.has(mimeType)) {
    throw badRequest(`Unsupported ${kind.toLowerCase()} type: ${mimeType}`);
  }
  if (sizeBytes > MAX_BYTES[kind]) {
    throw badRequest(`That file is larger than the ${Math.round(MAX_BYTES[kind] / (1024 * 1024))} MB limit`);
  }
}

async function blurhashOf(buffer: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return encodeBlurhash(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch (error) {
    logger.warn('blurhash failed', { error: String(error) });
    return null;
  }
}

let ffmpegChecked: boolean | null = null;
async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegChecked !== null) return ffmpegChecked;
  try {
    await run(env.FFMPEG_PATH, ['-version'], { timeout: 5000 });
    await run(env.FFPROBE_PATH, ['-version'], { timeout: 5000 });
    ffmpegChecked = true;
  } catch {
    ffmpegChecked = false;
    logger.warn('ffmpeg/ffprobe unavailable; video thumbnails and audio durations are skipped', {
      ffmpeg: env.FFMPEG_PATH,
    });
  }
  return ffmpegChecked;
}

interface Processed {
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  thumbnailKey: string | null;
  blurhash: string | null;
  waveform: number[] | null;
}

async function processImage(storageKey: string, mimeType: string): Promise<Processed> {
  const original = await getObjectBytes(storageKey);

  if (mimeType === 'image/gif') {
    const meta = await sharp(original, { animated: true, failOn: 'none' }).metadata();
    const thumb = await sharp(original, { animated: false, failOn: 'none' })
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    const thumbnailKey = `thumbnails/${storageKey}.jpg`;
    await putObject(thumbnailKey, thumb, 'image/jpeg');
    return {
      mimeType,
      sizeBytes: original.length,
      width: meta.width ?? null,
      height: meta.height ?? null,
      durationMs: null,
      thumbnailKey,
      blurhash: await blurhashOf(thumb),
      waveform: null,
    };
  }

  const resized = sharp(original, { failOn: 'none' })
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true });

  // Re-encoding drops EXIF (including GPS) and other container metadata; sharp
  // only preserves it when withMetadata() is called explicitly.
  const output = await (mimeType === 'image/png'
    ? resized.png({ compressionLevel: 9 })
    : mimeType === 'image/webp'
      ? resized.webp({ quality: 82 })
      : mimeType === 'image/avif'
        ? resized.avif({ quality: 50 })
        : resized.jpeg({ quality: 82, mozjpeg: true })).toBuffer();

  const info = await sharp(output).metadata();
  await putObject(storageKey, output, mimeType);

  const thumb = await sharp(output)
    .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();
  const thumbnailKey = `thumbnails/${storageKey}.jpg`;
  await putObject(thumbnailKey, thumb, 'image/jpeg');

  return {
    mimeType,
    sizeBytes: output.length,
    width: info.width ?? null,
    height: info.height ?? null,
    durationMs: null,
    thumbnailKey,
    blurhash: await blurhashOf(output),
    waveform: null,
  };
}

async function processVideo(storageKey: string): Promise<Processed> {
  const directory = await mkdtemp(path.join(tmpdir(), 'voidlink-video-'));
  const input = path.join(directory, 'input');
  try {
    await downloadObject(storageKey, input);
    let durationMs: number | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let thumbnailKey: string | null = null;
    let blurhash: string | null = null;

    if (await hasFfmpeg()) {
      try {
        const probe = await run(
          env.FFPROBE_PATH,
          [
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'stream=width,height:format=duration',
            '-of',
            'json',
            input,
          ],
          { timeout: 30_000 },
        );
        const parsed = JSON.parse(probe.stdout) as {
          streams?: Array<{ width?: number; height?: number }>;
          format?: { duration?: string };
        };
        width = parsed.streams?.[0]?.width ?? null;
        height = parsed.streams?.[0]?.height ?? null;
        const seconds = Number(parsed.format?.duration);
        durationMs = Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
      } catch (error) {
        logger.warn('ffprobe failed', { error: String(error) });
      }

      const frame = path.join(directory, 'frame.jpg');
      const seek = durationMs ? Math.min(1, durationMs / 2000) : 0;
      try {
        await run(
          env.FFMPEG_PATH,
          ['-ss', String(seek), '-i', input, '-frames:v', '1', '-vf', 'scale=1280:-2', '-y', frame],
          { timeout: 30_000 },
        );
        const thumb = await sharp(frame)
          .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 78 })
          .toBuffer();
        thumbnailKey = `thumbnails/${storageKey}.jpg`;
        await putObject(thumbnailKey, thumb, 'image/jpeg');
        blurhash = await blurhashOf(thumb);
      } catch (error) {
        logger.warn('video thumbnail failed', { error: String(error) });
      }
    }

    return {
      mimeType: '',
      sizeBytes: 0,
      width,
      height,
      durationMs,
      thumbnailKey,
      blurhash,
      waveform: null,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function processAudio(
  storageKey: string,
  durationMs: number | undefined,
  waveform: number[] | undefined,
): Promise<Processed> {
  let resolvedDuration = durationMs ?? null;

  if (resolvedDuration === null && (await hasFfmpeg())) {
    const directory = await mkdtemp(path.join(tmpdir(), 'voidlink-audio-'));
    const input = path.join(directory, 'input');
    try {
      await downloadObject(storageKey, input);
      const probe = await run(
        env.FFPROBE_PATH,
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', input],
        { timeout: 20_000 },
      );
      const parsed = JSON.parse(probe.stdout) as { format?: { duration?: string } };
      const seconds = Number(parsed.format?.duration);
      resolvedDuration = Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
    } catch (error) {
      logger.warn('audio probe failed', { error: String(error) });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  return {
    mimeType: '',
    sizeBytes: 0,
    width: null,
    height: null,
    durationMs: resolvedDuration,
    thumbnailKey: null,
    blurhash: null,
    waveform: waveform ?? null,
  };
}

export async function presignUpload(userId: string, raw: unknown): Promise<PresignedUploadDTO> {
  const input = presignUploadSchema.parse(raw);
  assertAllowed(input.kind, input.mimeType, input.sizeBytes);

  const id = randomUUID();
  const extension = EXTENSIONS[input.mimeType] ?? 'bin';
  const storageKey = `uploads/${userId}/${id}.${extension}`;

  await prisma.upload.create({
    data: {
      id,
      userId,
      kind: input.kind,
      storageKey,
      bucket: mediaBucket,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      status: 'PENDING',
      scanStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const url = await presignPut(storageKey, input.mimeType);
  return {
    uploadId: id,
    key: storageKey,
    url,
    expiresIn: env.UPLOAD_URL_TTL_SECONDS,
    headers: { 'content-type': input.mimeType },
  };
}

export async function completeUpload(
  userId: string,
  uploadId: string,
  raw: unknown,
): Promise<CompletedUploadDTO> {
  const meta = completeUploadSchema.parse(raw ?? {});
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { attachment: true },
  });

  if (!upload || upload.userId !== userId) throw notFound('Upload not found');
  if (upload.status === 'READY' && upload.attachment) {
    return { uploadId: upload.id, attachment: toAttachmentDTO(upload.attachment) };
  }
  if (upload.status !== 'PENDING') throw badRequest('This upload can no longer be completed');

  const head = await headObject(upload.storageKey).catch(() => null);
  if (!head) throw badRequest('Upload the file before completing it');
  const actualSize = head.ContentLength ?? 0;
  if (actualSize <= 0) throw badRequest('The uploaded file is empty');
  if (actualSize > Number(upload.sizeBytes) * 1.05 + 1024) {
    throw badRequest('The uploaded file is larger than declared');
  }

  const processed =
    upload.kind === 'IMAGE'
      ? await processImage(upload.storageKey, upload.mimeType)
      : upload.kind === 'VIDEO'
        ? await processVideo(upload.storageKey)
        : upload.kind === 'AUDIO' || upload.kind === 'VOICE'
          ? await processAudio(upload.storageKey, meta.durationMs, meta.waveform)
          : {
              mimeType: '',
              sizeBytes: 0,
              width: null,
              height: null,
              durationMs: null,
              thumbnailKey: null,
              blurhash: null,
              waveform: null,
            };

  const attachment = await prisma.$transaction(async (tx) => {
    const created = await tx.attachment.create({
      data: {
        uploadId: upload.id,
        kind: upload.kind,
        storageKey: upload.storageKey,
        bucket: upload.bucket,
        mimeType: upload.mimeType,
        sizeBytes: BigInt(processed.sizeBytes || actualSize),
        width: processed.width,
        height: processed.height,
        durationMs: processed.durationMs,
        thumbnailKey: processed.thumbnailKey,
        blurhash: processed.blurhash,
        waveform: processed.waveform ?? undefined,
        checksum: null,
        scanStatus: 'CLEAN',
      },
    });

    await tx.upload.update({
      where: { id: upload.id },
      data: { status: 'READY', scanStatus: 'CLEAN', completedAt: new Date() },
    });

    return created;
  });

  return { uploadId: upload.id, attachment: toAttachmentDTO(attachment) };
}

export async function openViewOnce(userId: string, attachmentId: string): Promise<OpenViewOnceDTO> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: {
        include: {
          conversation: {
            include: { participants: { where: { leftAt: null }, select: { userId: true } } },
          },
        },
      },
    },
  });

  if (!attachment) throw notFound('Attachment not found');
  if (!attachment.viewOnce) throw badRequest('This attachment is not view-once');
  if (attachment.kind !== 'IMAGE' && attachment.kind !== 'VIDEO') {
    throw badRequest('Only photos and videos can be view-once');
  }
  const participants = attachment.message?.conversation.participants ?? [];
  if (!participants.some((participant) => participant.userId === userId)) {
    throw forbidden('You are not part of this conversation');
  }

  // Atomic burn: only the first open wins, so two tabs cannot both see it.
  const burned = await prisma.attachment.updateMany({
    where: { id: attachmentId, openedAt: null },
    data: { openedAt: new Date() },
  });
  if (burned.count === 0) {
    throw new AppError(410, 'ATTACHMENT_VIEWED', 'This view-once attachment was already opened');
  }

  if (attachment.messageId) {
    await prisma.message
      .update({ where: { id: attachment.messageId }, data: { viewedAt: new Date() } })
      .catch(() => {});
  }

  const ttlSeconds = 300;
  return {
    url: mediaUrl(attachment.id, 'full', ttlSeconds),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}

/**
 * Re-signs delivery URLs for a message attachment. Signed URLs are deliberately
 * short-lived, so a chat left open for longer than the TTL asks for a fresh one
 * instead of rendering a broken image. Access is participant-scoped.
 */
export async function refreshAttachmentUrls(
  userId: string,
  attachmentId: string,
): Promise<AttachmentUrlsDTO> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      upload: { select: { userId: true } },
      message: {
        include: {
          conversation: {
            include: { participants: { where: { leftAt: null }, select: { userId: true } } },
          },
        },
      },
    },
  });

  if (!attachment) throw notFound('Attachment not found');
  if (attachment.viewOnce) {
    throw badRequest('Open view-once media through its burn endpoint');
  }

  const allowed = attachment.message
    ? attachment.message.conversation.participants.some(
        (participant) => participant.userId === userId,
      )
    : attachment.upload?.userId === userId;
  if (!allowed) throw forbidden('You do not have access to this media');

  const ttlSeconds = env.MEDIA_URL_TTL_SECONDS;
  return {
    url: mediaUrl(attachment.id, 'full', ttlSeconds),
    thumbnailUrl: attachment.thumbnailKey
      ? mediaUrl(attachment.id, 'thumb', ttlSeconds)
      : null,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}

export interface ResolvedMedia {
  key: string;
  mimeType: string;
  sizeBytes: number;
  viewOnce: boolean;
}

export async function resolveMedia(
  attachmentId: string,
  variantRaw: unknown,
  token: string | undefined,
): Promise<ResolvedMedia> {
  const variant = variantRaw === 'thumb' ? 'thumb' : 'full';
  if (!verifyMediaToken(attachmentId, variant, token)) {
    throw new AppError(401, 'MEDIA_TOKEN_INVALID', 'This media link has expired');
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw notFound('Attachment not found');

  const key = variant === 'thumb' ? attachment.thumbnailKey : attachment.storageKey;
  if (!key) throw notFound('This attachment has no thumbnail');

  return {
    key,
    mimeType: variant === 'thumb' ? 'image/jpeg' : attachment.mimeType,
    sizeBytes: Number(attachment.sizeBytes),
    viewOnce: attachment.viewOnce,
  };
}
