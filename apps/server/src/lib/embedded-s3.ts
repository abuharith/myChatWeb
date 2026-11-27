import { isProduction } from '../config/env';
import { logger } from './logger';

/**
 * Development convenience: an in-process S3 API so `npm run dev` can exercise
 * presigned uploads without MinIO or Docker. Never used in production.
 */
export async function startEmbeddedS3(): Promise<void> {
  if (isProduction) throw new Error('Embedded S3 is a development-only feature');

  const { default: S3rver } = await import('s3rver');
  const port = Number(process.env.S3_EMBEDDED_PORT ?? 4568);
  const server = new S3rver({
    port,
    address: '127.0.0.1',
    silent: true,
    directory: process.env.S3_EMBEDDED_DIR ?? '/tmp/voidlink-s3',
    configureBuckets: [{ name: process.env.S3_BUCKET ?? 'voidlink-media' }],
    allowMismatchedSignatures: true,
  });

  await server.run();
  logger.info('embedded S3 listening', { port });
}
