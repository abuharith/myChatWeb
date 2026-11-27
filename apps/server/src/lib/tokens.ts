import { createHash, randomUUID } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { unauthorized } from './errors';

export interface AccessClaims extends JwtPayload {
  sub: string;
  role: string;
}

export interface RefreshClaims extends JwtPayload {
  sub: string;
  sid: string;
}

export function signAccessToken(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'voidlink',
    audience: 'voidlink-web',
  });
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: 'voidlink',
    audience: 'voidlink-session',
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'voidlink',
      audience: 'voidlink-web',
    });
    if (typeof payload === 'string' || !payload.sub) throw new Error('malformed');
    return payload as AccessClaims;
  } catch {
    throw unauthorized('Access token is invalid or expired');
  }
}

export function verifyRefreshToken(token: string): RefreshClaims {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'voidlink',
      audience: 'voidlink-session',
    });
    if (typeof payload === 'string' || !payload.sub || typeof payload.sid !== 'string') {
      throw new Error('malformed');
    }
    return payload as RefreshClaims;
  } catch {
    throw unauthorized('Session expired');
  }
}

/** Refresh tokens are stored as SHA-256 digests, never in plaintext. */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
