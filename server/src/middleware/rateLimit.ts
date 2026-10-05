/**
 * Phase 14 — Layered rate limits.
 *
 * - globalLimiter: broad protection for authenticated API
 * - authLimiter: stricter on login / refresh / password
 * - publicLimiter: public track endpoint (already rate-limited in Phase 09; keep aligned)
 */

import rateLimit from 'express-rate-limit';
import { env, isProd } from '../config/env.js';

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
  // Skip health checks so probes never trip the limit
  skip: (req) => req.path === '/api/v1/health' || req.path === '/api/v1/ready',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

// Dedicated name for the public tracking route.
export const publicTrackLimiter = publicLimiter;
