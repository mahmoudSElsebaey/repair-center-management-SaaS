import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

/**
 * Canonical RepairFlow error payload:
 * { success: false, message: string, code: string, errors?: unknown }
 *
 * Internal failures never leak stack traces or driver messages to clients.
 * The `requestId` lets a support engineer correlate a user report with the log line.
 */

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: `Invalid value for "${err.path}"`,
      code: 'INVALID_IDENTIFIER',
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'MONGOOSE_VALIDATION',
      errors: Object.entries(err.errors).map(([path, issue]) => ({
        path,
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof mongoose.Error.DocumentNotFoundError) {
    res.status(404).json({ success: false, message: 'Resource not found', code: 'NOT_FOUND' });
    return;
  }

  // Mongo duplicate key (e.g. an email that already exists)
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue || {};
    const field = Object.keys(keyValue)[0];
    res.status(409).json({
      success: false,
      message: field ? `That ${field} is already in use` : 'Duplicate value',
      code: 'DUPLICATE_KEY',
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(`[errorHandler:${requestId}] ${req.method} ${req.originalUrl}`, stack || message);

  res.status(500).json({
    success: false,
    message: config.isProduction ? 'Something went wrong on our side' : message,
    code: 'INTERNAL_ERROR',
    ...(config.isProduction ? {} : { requestId }),
  });
}
