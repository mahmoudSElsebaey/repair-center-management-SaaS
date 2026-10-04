/**
 * Phase 14 — Central production error handler.
 *
 * - Never leak stack traces or internal messages in production.
 * - Maps known AppError / Zod / Mongoose errors to stable codes.
 * - Logs full detail server-side with request id.
 */

import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isProd } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function requestId(req: Request): string {
  return (req.headers['x-request-id'] as string) || 'unknown';
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const rid = requestId(req);

  // Zod validation
  if (err instanceof ZodError) {
    logger.warn({ rid, issues: err.issues }, 'Validation error');
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ rid, code: err.code, err }, err.message);
    } else {
      logger.warn({ rid, code: err.code }, err.message);
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && !isProd ? { details: err.details } : {}),
      },
    });
  }

  // Mongoose duplicate key
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  ) {
    logger.warn({ rid, err }, 'Duplicate key');
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE',
        message: 'A record with this unique value already exists',
      },
    });
  }

  // CORS errors from cors middleware
  if (err instanceof Error && err.message.startsWith('CORS blocked')) {
    logger.warn({ rid }, err.message);
    return res.status(403).json({
      success: false,
      error: { code: 'CORS_DENIED', message: 'Origin not allowed' },
    });
  }

  // Fallback — never expose internals in production
  logger.error({ rid, err }, 'Unhandled error');
  const message =
    isProd || !(err instanceof Error)
      ? 'An unexpected error occurred'
      : err.message;

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
};
