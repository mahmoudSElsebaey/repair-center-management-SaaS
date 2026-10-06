/**
 * Phase 14 — Typed, validated environment configuration.
 *
 * All secrets and production flags are read once at boot through Zod.
 * Aligns with config/index.ts: CLIENT_URL is accepted as CLIENT_ORIGIN fallback.
 */

import { z } from 'zod';

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  });

/** Prefer CLIENT_ORIGIN; fall back to CLIENT_URL (used by config/index.ts / CORS). */
function resolveClientOrigin(): string {
  const origin = (process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || '').trim();
  if (origin) {
    // If comma-separated, take the first as primary origin
    return origin.split(',')[0].trim().replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),

    MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/fixer'),

    JWT_ACCESS_SECRET: z
      .string()
      .min(1)
      .default('dev_access_secret_change_me_min_32_chars_flow'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(1)
      .default('dev_refresh_secret_change_me_min_32_chars_flow'),
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
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;

    if (data.CLIENT_ORIGIN.includes('localhost')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLIENT_ORIGIN'],
        message:
          'Production CLIENT_ORIGIN/CLIENT_URL must be a real public origin (not localhost)',
      });
    }

    if (data.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'Production JWT_ACCESS_SECRET must be at least 32 characters',
      });
    }
    if (data.JWT_REFRESH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'Production JWT_REFRESH_SECRET must be at least 32 characters',
      });
    }

    if (/localhost|127\.0\.0\.1/.test(data.MONGODB_URI)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGODB_URI'],
        message: 'Production MONGODB_URI must not point at localhost',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const prefilled = {
    ...process.env,
    CLIENT_ORIGIN: resolveClientOrigin(),
    // Accept both naming conventions for JWT expiry
    JWT_ACCESS_EXPIRES:
      process.env.JWT_ACCESS_EXPIRES || process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES:
      process.env.JWT_REFRESH_EXPIRES || process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };

  const parsed = envSchema.safeParse(prefilled);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    console.error('❌ Invalid environment configuration:\n' + details);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

/** Origins allowed by CORS (CLIENT_ORIGIN + optional ALLOWED_ORIGINS list). */
export function corsOrigins(): string[] {
  const set = new Set<string>();
  set.add(env.CLIENT_ORIGIN.replace(/\/$/, ''));
  // Also include full CLIENT_URL list if present
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
