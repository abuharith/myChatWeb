import type { Request, Response } from 'express';
import type { Readable } from 'node:stream';
import { unauthorized } from '../../lib/errors';
import { getObject } from '../../lib/storage';
import * as mediaService from '../../services/media.service';

export async function presign(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const data = await mediaService.presignUpload(req.auth.userId, req.body);
  res.status(201).json({ data });
}

export async function complete(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const data = await mediaService.completeUpload(req.auth.userId, req.params.id ?? '', req.body);
  res.json({ data });
}

export async function viewOnce(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const data = await mediaService.openViewOnce(req.auth.userId, req.params.id ?? '');
  res.json({ data });
}

/**
 * Streams private media through the API with a signed, time-limited token.
 * Range requests are forwarded so audio/video can seek.
 */
export async function stream(req: Request, res: Response) {
  const media = await mediaService.resolveMedia(
    req.params.id ?? '',
    req.query.variant,
    typeof req.query.token === 'string' ? req.query.token : undefined,
  );

  const range = typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const object = await getObject(media.key, range);

  res.setHeader('Content-Type', media.mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', media.viewOnce ? 'private, no-store' : 'private, max-age=300');
  if (object.ContentLength !== undefined) {
    res.setHeader('Content-Length', String(object.ContentLength));
  }
  if (object.ContentRange) {
    res.status(206);
    res.setHeader('Content-Range', object.ContentRange);
  }

  const body = object.Body as Readable;
  body.on('error', () => res.destroy());
  body.pipe(res);
}

