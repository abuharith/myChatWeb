import { createHash } from 'node:crypto';
import type { LoginInput, RegisterInput } from '@voidlink/shared';
import { env } from '../config/env';
import { hashPassword, verifyPassword } from '../lib/password';
import { prisma } from '../lib/prisma';
import { conflict, forbidden, unauthorized } from '../lib/errors';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/tokens';
import { createUser, findByIdentifier } from '../repositories/users.repo';
import type { User } from '@prisma/client';

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface IssuedSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  avatarUrl: user.avatarUrl,
});

function hashIp(ip?: string): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function issueSession(user: User, meta: SessionMeta): Promise<IssuedSession> {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: `pending:${user.id}:${Date.now()}`,
      expiresAt: refreshExpiry(),
      ipHash: hashIp(meta.ip),
      userAgent: meta.userAgent?.slice(0, 500) ?? null,
    },
  });

  const refreshToken = signRefreshToken(user.id, session.id);
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashToken(refreshToken) },
  });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ id: user.id, role: user.role }),
    refreshToken,
  };
}

export async function register(input: RegisterInput, meta: SessionMeta): Promise<IssuedSession> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username: input.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    throw conflict(
      existing.email === email ? 'That email is already registered' : 'That username is taken',
    );
  }

  let user: User;
  try {
    user = await createUser({
      username: input.username,
      displayName: input.displayName,
      email,
      passwordHash: await hashPassword(input.password),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw conflict('That email or username is already registered');
    }
    throw error;
  }

  return issueSession(user, meta);
}

export async function login(input: LoginInput, meta: SessionMeta): Promise<IssuedSession> {
  const user = await findByIdentifier(input.identifier);
  if (!user || !user.passwordHash) throw unauthorized('Invalid credentials');
  if (user.bannedAt) throw forbidden('This account is suspended');
  if (user.deletedAt) throw unauthorized('Invalid credentials');

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw unauthorized('Invalid credentials');

  return issueSession(user, meta);
}

/**
 * Refresh rotation with reuse detection: the presented token must match the
 * stored digest. A valid-but-unknown token means an old token was replayed, so
 * every session for that user is revoked.
 */
export async function rotate(refreshToken: string, meta: SessionMeta): Promise<IssuedSession> {
  const claims = verifyRefreshToken(refreshToken);
  const digest = hashToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: digest },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    await prisma.session.updateMany({
      where: { userId: claims.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Session expired, please sign in again');
  }

  if (session.user.bannedAt) {
    throw forbidden('This account is suspended');
  }

  const nextToken = signRefreshToken(session.userId, session.id);
  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(nextToken),
      lastUsedAt: new Date(),
      expiresAt: refreshExpiry(),
      ipHash: hashIp(meta.ip) ?? session.ipHash,
      userAgent: meta.userAgent?.slice(0, 500) ?? session.userAgent,
    },
  });

  return {
    user: toPublicUser(session.user),
    accessToken: signAccessToken({ id: session.userId, role: session.user.role }),
    refreshToken: nextToken,
  };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.session
    .updateMany({
      where: { refreshTokenHash: hashToken(refreshToken) },
      data: { revokedAt: new Date() },
    })
    .catch(() => {});
}

export async function currentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw unauthorized();
  return toPublicUser(user);
}
