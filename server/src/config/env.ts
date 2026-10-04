/**
 * Phase 14 — Typed, validated environment configuration.
 *
 * All secrets and production flags are read once at boot through Zod.
 * The process exits early if required production variables are missing.
 *
 * Integration: replace ad-hoc `process.env.X` reads with `env.X` from this module.
 */

import { z } from 'zod';

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),

    // Mongo
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    // Auth
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES: z.string().default('15m'),
    JWT_REFRESH_EXPIRES: z.string().default('7d'),

    // CORS / public origins (comma-separated)
    CLIENT_ORIGIN: z.string().min(1, 'CLIENT_ORIGIN is required in production'),
    ALLOWED_ORIGINS: z.string().optional(),

    // Rate limits
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

    // Optional integrations
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // Ops
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    TRUST_PROXY: boolFromString.default(false),
    ENABLE_REQUEST_LOGGING: boolFromString.default(true),

    // Health / readiness
    HEALTH_DEEP_CHECK: boolFromString.default(true),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.CLIENT_ORIGIN || data.CLIENT_ORIGIN.includes('localhost')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLIENT_ORIGIN'],
          message: 'Production CLIENT_ORIGIN must be a real public origin (not localhost)',
        });
      }
      if (data.JWT_ACCESS_SECRET.length < 48) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message: 'Production JWT secrets should be ≥ 48 characters',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
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
  if (env.ALLOWED_ORIGINS) {
    for (const o of env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = o.trim().replace(/\/$/, '');
      if (trimmed) set.add(trimmed);
    }
  }
  return [...set];
}
