/**
 * Typed env helper used by rateLimit / logger / errorHandler.
 * Must not process.exit on Vercel — throw so the API handler can return JSON.
 */

import { z } from 'zod';

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  });

function resolveClientOrigin(): string {
  const origin = (process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || '').trim();
  if (origin) {
    return origin.split(',')[0].trim().replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/fixer'),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev_access_secret_change_me_min_32_chars_flow'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev_refresh_secret_change_me_min_32_chars_flow'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().min(1),
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TRUST_PROXY: boolFromString.default(true),
  ENABLE_REQUEST_LOGGING: boolFromString.default(true),
  HEALTH_DEEP_CHECK: boolFromString.default(true),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const prefilled = {
    ...process.env,
    CLIENT_ORIGIN: resolveClientOrigin(),
    JWT_ACCESS_EXPIRES:
      process.env.JWT_ACCESS_EXPIRES || process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES:
      process.env.JWT_REFRESH_EXPIRES || process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };

  const parsed = envSchema.safeParse(prefilled);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    const msg = `Invalid environment: ${details}`;
    console.error('[env]', msg);
    if (process.env.VERCEL) {
      throw new Error(msg);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

export function corsOrigins(): string[] {
  const set = new Set<string>();
  set.add(env.CLIENT_ORIGIN.replace(/\/$/, ''));
  const clientUrl = (process.env.CLIENT_URL || '').trim();
  if (clientUrl) {
    for (const o of clientUrl.split(',')) {
      const trimmed = o.trim().replace(/\/$/, '');
      if (trimmed) set.add(trimmed);
    }
  }
  if (env.ALLOWED_ORIGINS) {
    for (const o of env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = o.trim().replace(/\/$/, '');
      if (trimmed) set.add(trimmed);
    }
  }
  return [...set];
}
