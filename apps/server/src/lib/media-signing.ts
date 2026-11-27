import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

/**
 * Media lives in a private bucket. Delivery URLs carry a short-lived HMAC so
 * <img>/<video> can load them without an Authorization header, and so the
 * server can keep view-once media out of the DTO entirely until it is opened.
 */
const secret = env.MEDIA_SIGNING_SECRET ?? env.JWT_ACCESS_SECRET;

function signature(attachmentId: string, variant: string, expiresAt: number): string {
  return createHmac('sha256', secret)
    .update(`${attachmentId}:${variant}:${expiresAt}`)
    .digest('base64url');
}

export function mediaUrl(
  attachmentId: string,
  variant: 'full' | 'thumb',
  ttlSeconds = env.MEDIA_URL_TTL_SECONDS,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = `${expiresAt}.${signature(attachmentId, variant, expiresAt)}`;
  return `/v1/media/${attachmentId}?variant=${variant}&token=${encodeURIComponent(token)}`;
}

export function verifyMediaToken(
  attachmentId: string,
  variant: string,
  token: string | undefined,
): boolean {
  if (!token) return false;
  const [expiresRaw, provided] = token.split('.');
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || !provided) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = signature(attachmentId, variant, expiresAt);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
