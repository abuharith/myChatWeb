import { env } from '../config/env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { deleteObject } from '../lib/storage';

export interface MediaSweepResult {
  attachmentsPurged: number;
  uploadsExpired: number;
  objectsRemoved: number;
  failures: number;
}

function isMissingObject(error: unknown): boolean {
  const name = (error as { name?: string; Code?: string })?.name;
  const code = (error as { Code?: string })?.Code;
  return name === 'NoSuchKey' || name === 'NotFound' || code === 'NoSuchKey' || code === 'NotFound';
}

async function purgeKeys(keys: Array<string | null>, result: MediaSweepResult): Promise<boolean> {
  let ok = true;
  for (const key of new Set(keys.filter((value): value is string => Boolean(value)))) {
    try {
      await deleteObject(key);
      result.objectsRemoved += 1;
    } catch (error) {
      if (isMissingObject(error)) continue;
      ok = false;
      result.failures += 1;
      logger.warn('media purge failed; will retry', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return ok;
}

/**
 * Reclaims media that must not stay in object storage:
 *
 *  - view-once attachments opened longer ago than the delivery grace window,
 *  - attachments whose message was deleted (for everyone or soft-deleted),
 *  - attachments that were uploaded but never sent (orphans),
 *  - presigned uploads that expired before being completed.
 *
 * Rows are kept for delivered media (`purgedAt` marks them) so the chat can
 * render a tombstone; never-sent attachments and their upload rows are removed.
 * Failures leave the row untouched so the next pass retries it.
 */
export async function sweepMediaLifecycle(now: Date = new Date()): Promise<MediaSweepResult> {
  const result: MediaSweepResult = {
    attachmentsPurged: 0,
    uploadsExpired: 0,
    objectsRemoved: 0,
    failures: 0,
  };

  const viewOnceCutoff = new Date(now.getTime() - env.MEDIA_VIEW_ONCE_GRACE_SECONDS * 1000);
  const orphanCutoff = new Date(now.getTime() - env.MEDIA_ORPHAN_GRACE_SECONDS * 1000);

  const attachments = await prisma.attachment.findMany({
    where: {
      purgedAt: null,
      OR: [
        { viewOnce: true, openedAt: { not: null, lte: viewOnceCutoff } },
        { messageId: null, createdAt: { lte: orphanCutoff } },
        {
          message: {
            OR: [{ deletedForEveryone: true }, { deletedAt: { not: null } }],
          },
        },
      ],
    },
    select: {
      id: true,
      storageKey: true,
      thumbnailKey: true,
      transcodeKey: true,
      messageId: true,
      uploadId: true,
    },
    orderBy: { createdAt: 'asc' },
    take: env.MEDIA_SWEEP_BATCH,
  });

  for (const attachment of attachments) {
    const removed = await purgeKeys(
      [attachment.storageKey, attachment.thumbnailKey, attachment.transcodeKey],
      result,
    );
    if (!removed) continue;

    if (attachment.messageId === null) {
      await prisma.$transaction(async (tx) => {
        await tx.attachment.delete({ where: { id: attachment.id } });
        if (attachment.uploadId) {
          await tx.upload.deleteMany({ where: { id: attachment.uploadId } });
        }
      });
    } else {
      await prisma.attachment.update({
        where: { id: attachment.id },
        data: { purgedAt: now },
      });
    }
    result.attachmentsPurged += 1;
  }

  // Presigned PUTs that were never completed still hold bytes if the client
  // uploaded before walking away; deleting a key that was never written is a no-op.
  const expiredUploads = await prisma.upload.findMany({
    where: { status: 'PENDING', expiresAt: { lte: now }, attachment: null },
    select: { id: true, storageKey: true },
    orderBy: { createdAt: 'asc' },
    take: env.MEDIA_SWEEP_BATCH,
  });

  for (const upload of expiredUploads) {
    const removed = await purgeKeys([upload.storageKey], result);
    if (!removed) continue;
    const updated = await prisma.upload.updateMany({
      where: { id: upload.id, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    if (updated.count > 0) result.uploadsExpired += 1;
  }

  if (result.attachmentsPurged || result.uploadsExpired || result.failures) {
    logger.info('media sweep finished', { ...result });
  }
  return result;
}

let timer: NodeJS.Timeout | null = null;

/** Runs the sweep on an interval; safe to call once at boot. */
export function startMediaSweep(): void {
  if (env.MEDIA_SWEEP_DISABLED) {
    logger.info('media sweep disabled');
    return;
  }
  if (timer) return;

  const run = () => {
    void sweepMediaLifecycle().catch((error) => {
      logger.warn('media sweep failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  };

  timer = setInterval(run, env.MEDIA_SWEEP_INTERVAL_SECONDS * 1000);
  timer.unref();
  const initial = setTimeout(run, 5_000);
  initial.unref();
  logger.info('media sweep scheduled', { intervalSeconds: env.MEDIA_SWEEP_INTERVAL_SECONDS });
}
