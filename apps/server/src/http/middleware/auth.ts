import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../../lib/errors';
import { verifyAccessToken } from '../../lib/tokens';

export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized());
    return;
  }

  try {
    const claims = verifyAccessToken(header.slice(7));
    req.auth = { userId: claims.sub, role: claims.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role: 'MODERATOR' | 'ADMIN') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    const hierarchy = { USER: 0, MODERATOR: 1, ADMIN: 2 } as const;
    const current = hierarchy[req.auth.role as keyof typeof hierarchy] ?? 0;
    if (current < hierarchy[role]) return next(unauthorized('Insufficient permissions'));
    next();
  };
}
