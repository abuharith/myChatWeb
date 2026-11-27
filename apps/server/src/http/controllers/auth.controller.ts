import type { CookieOptions, Request, Response } from 'express';
import { loginSchema, registerSchema } from '@voidlink/shared';
import { env } from '../../config/env';
import { unauthorized } from '../../lib/errors';
import * as authService from '../../services/auth.service';

const COOKIE_NAME = 'voidlink_rt';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});

function meta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

function respondWithSession(res: Response, session: authService.IssuedSession, status = 200) {
  res.cookie(COOKIE_NAME, session.refreshToken, cookieOptions());
  res.status(status).json({
    data: {
      user: session.user,
      accessToken: session.accessToken,
    },
  });
}

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const session = await authService.register(input, meta(req));
  respondWithSession(res, session, 201);
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const session = await authService.login(input, meta(req));
  respondWithSession(res, session);
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) throw unauthorized('No session to refresh');

  try {
    const session = await authService.rotate(token, meta(req));
    respondWithSession(res, session);
  } catch (error) {
    res.clearCookie(COOKIE_NAME, { path: '/v1/auth' });
    throw error;
  }
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  await authService.logout(token);
  res.clearCookie(COOKIE_NAME, { path: '/v1/auth' });
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const user = await authService.currentUser(req.auth.userId);
  res.json({ data: { user } });
}
