/**
 * Phase 14 — Layered rate limits.
 */

import rateLimitImport from 'express-rate-limit';
import type { Request } from 'express';
import { env, isProd } from '../config/env.js';

// express-rate-limit CJS/ESM interop under NodeNext / Vercel TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rateLimit = ((rateLimitImport as any).default ?? rateLimitImport) as typeof rateLimitImport;

const windowMs = env.RATE_LIMIT_WINDOW_MS;

export const globalLimiter = rateLimit({
  windowMs,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    },
  },
  skip: (req: Request) => req.path === '/api/v1/health' || req.path === '/api/v1/ready',
});

export const apiLimiter = globalLimiter;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts. Try again in 15 minutes.',
    },
  },
});

export const publicLimiter = rateLimit({
  windowMs,
  max: env.PUBLIC_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PUBLIC_RATE_LIMITED',
      message: 'Too many tracking requests. Please wait a moment.',
    },
  },
});

export const publicTrackLimiter = publicLimiter;

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMITED',
      message: 'Too many password reset attempts. Please try again later.',
    },
  },
});
