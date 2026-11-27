import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, isProduction } from './config/env';
import { buildRouter } from './http/routes';
import { errorHandler, notFoundHandler } from './http/middleware/error';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false, // the API serves JSON only; CSP belongs to the web app
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  if (!isProduction) {
    app.use((req, _res, next) => {
      if (req.path !== '/v1/health') {
        import('./lib/logger').then(({ logger }) =>
          logger.debug('request', { method: req.method, path: req.path }),
        );
      }
      next();
    });
  }

  app.use('/v1', buildRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
