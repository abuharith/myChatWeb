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
}

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
