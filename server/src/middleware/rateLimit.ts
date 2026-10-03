import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

/** Rate limiting is disabled under test so suites are deterministic. */
const skip = () => config.isTest;

/** Broad protection for every API route. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    message: 'Too many requests — please slow down and try again shortly.',
    code: 'RATE_LIMITED',
  },
});

/**
 * Login and refresh. Generous enough for an office behind one NAT address,
 * tight enough to make credential stuffing impractical.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip,
  message: {
    success: false,
    message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
    code: 'AUTH_RATE_LIMITED',
  },
});

/** Password reset flows are the most abused surface. */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMITED',
  },
});

/** Public QR tracking lookups — cheap reads, but still worth bounding. */
export const publicTrackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    message: 'Too many tracking requests. Please try again in a minute.',
    code: 'TRACK_RATE_LIMITED',
  },
});
