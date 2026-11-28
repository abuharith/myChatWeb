import { z } from 'zod';

const DEV_ACCESS_SECRET = 'dev-only-access-secret-do-not-use-in-production';
const DEV_REFRESH_SECRET = 'dev-only-refresh-secret-do-not-use-in-production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z
    .string()
    .default('postgresql://voidlink:voidlink@127.0.0.1:55432/voidlink'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().default(DEV_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().default(DEV_REFRESH_SECRET),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().default(30),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // S3-compatible object storage (MinIO locally, Cloudflare R2 in production).
  S3_ENDPOINT: z.string().optional(),
  /** Endpoint embedded in presigned upload URLs (must be reachable by browsers). */
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('voidlink-media'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((value) => value !== 'false'),
  /** Development only: run an in-process S3 API instead of MinIO. */
  S3_EMBEDDED: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  MEDIA_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3600),
  MEDIA_SIGNING_SECRET: z.string().optional(),
  /** Background job that deletes burned view-once / deleted / orphaned media. */
  MEDIA_SWEEP_DISABLED: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  MEDIA_SWEEP_INTERVAL_SECONDS: z.coerce.number().int().min(30).default(3600),
  MEDIA_SWEEP_BATCH: z.coerce.number().int().min(1).max(1000).default(200),
  /** Keep burned view-once objects long enough for the issued URL to be used. */
  MEDIA_VIEW_ONCE_GRACE_SECONDS: z.coerce.number().int().min(0).default(300),
  /** Unsent attachments (uploaded but never posted) are reclaimed after this. */
  MEDIA_ORPHAN_GRACE_SECONDS: z.coerce.number().int().min(0).default(86_400),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production') {
  if (env.JWT_ACCESS_SECRET === DEV_ACCESS_SECRET || env.JWT_REFRESH_SECRET === DEV_REFRESH_SECRET) {
    throw new Error('Refusing to start in production with development JWT secrets');
  }
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required in production');
  }
}

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
