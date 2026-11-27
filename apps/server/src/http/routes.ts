import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@voidlink/shared';
import { asyncHandler } from './async-handler';
import { unauthorized } from '../lib/errors';
import { authGuard } from './middleware/auth';
import { validateBody } from './middleware/validate';
import { loginSchema, registerSchema } from '@voidlink/shared';
import * as authController from './controllers/auth.controller';
import * as usersController from './controllers/users.controller';
import * as conversationController from './controllers/conversations.controller';
import * as mediaController from './controllers/media.controller';
import { get as getConversation } from '../services/conversation.service';

const uploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many uploads, wait a minute' } },
});

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: RATE_LIMITS.auth,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, wait a minute' } },
});

export function buildRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok', time: new Date().toISOString() } });
  });

  router.post(
    '/auth/register',
    authLimiter,
    validateBody(registerSchema),
    asyncHandler(authController.register),
  );
  router.post('/auth/login', authLimiter, validateBody(loginSchema), asyncHandler(authController.login));
  router.post('/auth/refresh', asyncHandler(authController.refresh));
  router.post('/auth/logout', asyncHandler(authController.logout));
  router.get('/auth/me', authGuard, asyncHandler(authController.me));

  router.get('/users/search', authGuard, asyncHandler(usersController.search));

  router.post(
    '/uploads/presign',
    authGuard,
    uploadLimiter,
    asyncHandler(mediaController.presign),
  );
  router.post('/uploads/:id/complete', authGuard, asyncHandler(mediaController.complete));
  router.get('/attachments/:id/url', authGuard, asyncHandler(mediaController.refreshUrls));
  router.post('/attachments/:id/view', authGuard, asyncHandler(mediaController.viewOnce));
  // Token-signed delivery so <img>/<video> can load private objects without a header.
  router.get('/media/:id', asyncHandler(mediaController.stream));

  router.get('/conversations', authGuard, asyncHandler(conversationController.list));
  router.post('/conversations', authGuard, asyncHandler(conversationController.create));
  router.get(
    '/conversations/:id',
    authGuard,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw unauthorized();
      const conversation = await getConversation(req.params.id ?? '', req.auth.userId);
      res.json({ data: { conversation } });
    }),
  );
  router.get('/conversations/:id/messages', authGuard, asyncHandler(conversationController.messages));
  router.post('/conversations/:id/messages', authGuard, asyncHandler(conversationController.sendMessage));
  router.post('/conversations/:id/read', authGuard, asyncHandler(conversationController.markRead));

  return router;
}
