import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, type IUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { UserRole } from '../types/domain.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

/**
 * Verifies the bearer access token and loads the account.
 * Accounts deactivated mid-session lose access immediately, without waiting
 * for the token to expire.
 */
export const protect = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Sign in to continue', 'TOKEN_MISSING');
    }

    const token = header.slice('Bearer '.length).trim();

    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
    } catch (error) {
      const expired = error instanceof jwt.TokenExpiredError;
      throw AppError.unauthorized(
        expired ? 'Your session has expired' : 'Your session is no longer valid',
        expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      );
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw AppError.unauthorized('This account no longer exists', 'ACCOUNT_NOT_FOUND');
    }
    if (!user.isActive) {
      throw AppError.forbidden('This account has been deactivated', 'ACCOUNT_INACTIVE');
    }

    req.user = user;
    next();
  }
);

/** Role gate. Always mount after `protect`. */
export const restrictTo =
  (...roles: UserRole[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('Your role does not allow this action', 'ROLE_FORBIDDEN'));
      return;
    }
    next();
  };
