/**
 * Operational (expected) error carrying an HTTP status and a stable machine-readable code.
 * Anything that is not an AppError is treated as an unexpected failure and its
 * message is hidden from clients in production.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly errors?: unknown;

  constructor(message: string, statusCode = 500, code = 'APP_ERROR', errors?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, AppError);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', errors?: unknown): AppError {
    return new AppError(message, 400, code, errors);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Insufficient permissions', code = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }
}
