/**
 * Phase 14 — Central production error handler.
 */

import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isProd } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError as UtilAppError } from '../utils/AppError.js';

/** Re-export so older imports keep working; prefer utils/AppError in controllers. */
export { UtilAppError as AppError };

function requestId(req: Request): string {
  return (req.headers['x-request-id'] as string) || 'unknown';
}

function isOperationalAppError(
  err: unknown
): err is { statusCode: number; code: string; message: string; details?: unknown; errors?: unknown } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return (
    typeof e.statusCode === 'number' &&
    typeof e.code === 'string' &&
    typeof e.message === 'string' &&
    (e.name === 'AppError' || e.isOperational === true || err instanceof UtilAppError)
  );
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

  if (isOperationalAppError(err)) {
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
        ...(!isProd && (err.details || err.errors)
          ? { details: err.details ?? err.errors }
          : {}),
      },
    });
  }

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

  if (err instanceof Error && err.message.startsWith('CORS blocked')) {
    logger.warn({ rid }, err.message);
    return res.status(403).json({
      success: false,
      error: { code: 'CORS_DENIED', message: 'Origin not allowed' },
    });
  }

  const rawMessage = err instanceof Error ? err.message : String(err);
  logger.error({ rid, err, rawMessage }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      // Keep message generic in production; include rid for log correlation
      message: isProd ? 'An unexpected error occurred' : rawMessage,
      requestId: rid,
      ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
};
