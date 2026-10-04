/**
 * Phase 14 — Production security middleware stack.
 *
 * Apply once after express() creation and before routes:
 *   app.use(securityStack());
 *
 * Includes Helmet defaults + CSP tuned for SPA + API, HSTS in production,
 * CORS with explicit origins, and body size limits elsewhere.
 */

import type { Express, RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env, isProd, corsOrigins } from '../config/env.js';

export function applySecurity(app: Express): void {
  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  // Helmet — secure defaults; CSP relaxed enough for Vite SPA + API
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind runtime needs inline in some builds
              imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://api.qrserver.com'],
              connectSrc: ["'self'", ...corsOrigins()],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false, // disable CSP noise in local Vite HMR
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProd
        ? {
            maxAge: 63_072_000, // 2 years
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  );

  // CORS — explicit allow-list only
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser tools (curl, server-to-server) with no Origin
        if (!origin) return callback(null, true);
        const allowed = corsOrigins();
        if (allowed.includes(origin.replace(/\/$/, ''))) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept-Language'],
      exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
      maxAge: 600,
    })
  );

  // Hide framework fingerprint
  app.disable('x-powered-by');
}

/**
 * Optional extra header hardening for sensitive routes (auth, payments).
 */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
};
