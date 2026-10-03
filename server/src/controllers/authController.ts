import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { User } from '../models/User.js';
// Registers the Branch schema. `getMe` populates `user.branch`, and Mongoose
// resolves populated model names at query time — an unimported model throws
// MissingSchemaError instead of degrading.
import '../models/Branch.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/authValidators.js';

const ACCESS_TTL_SECONDS = 15 * 60;

function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as jwt.SignOptions);
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Refresh tokens are stored hashed. A leaked database dump therefore does not
 * hand an attacker a usable session.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueSession(user: { _id: { toString(): string }; role: string }) {
  const userId = user._id.toString();
  const accessToken = signAccessToken(userId, user.role);
  const refreshToken = signRefreshToken(userId);
  return { accessToken, refreshToken, refreshTokenHash: hashToken(refreshToken) };
}

/**
 * POST /api/v1/auth/login
 * Authenticates an employee and starts a session.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+password');

  // Identical response for "no such account" and "wrong password" so the
  // endpoint cannot be used to enumerate staff emails.
  if (!user || !(await user.comparePassword(password))) {
    throw AppError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw AppError.forbidden(
      'This account has been deactivated. Contact your administrator.',
      'ACCOUNT_INACTIVE'
    );
  }

  const { accessToken, refreshToken, refreshTokenHash } = issueSession(user);

  user.refreshToken = refreshTokenHash;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    data: {
      user: user.toPublicJSON(),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL_SECONDS,
    },
  });
});

/**
 * POST /api/v1/auth/refresh
 * Rotates both tokens. A reused refresh token means the previous session was
 * compromised, so the stored hash no longer matches and the request is rejected.
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);

  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { sub: string };
  } catch {
    throw AppError.unauthorized('Your session has expired — please sign in again', 'REFRESH_INVALID');
  }

  const user = await User.findById(payload.sub).select('+refreshToken');
  if (!user || !user.refreshToken || user.refreshToken !== hashToken(refreshToken)) {
    throw AppError.unauthorized('Your session is no longer valid', 'REFRESH_REVOKED');
  }
  if (!user.isActive) {
    throw AppError.forbidden('This account has been deactivated', 'ACCOUNT_INACTIVE');
  }

  const next = issueSession(user);
  user.refreshToken = next.refreshTokenHash;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      expiresIn: ACCESS_TTL_SECONDS,
    },
  });
});

/**
 * POST /api/v1/auth/logout
 * Revokes the stored refresh token so the session cannot be resumed.
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user) {
    await User.updateOne({ _id: req.user._id }, { $unset: { refreshToken: 1 } });
  }
  res.status(200).json({ success: true, message: 'Signed out successfully' });
});

/** GET /api/v1/auth/me */
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await User.findById(req.user._id).populate('branch', 'name code');
  if (!user) throw AppError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');

  res.status(200).json({ success: true, data: { user: user.toPublicJSON() } });
});

/** PATCH /api/v1/auth/me */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const updates = updateProfileSchema.parse(req.body);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) throw AppError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');

  res.status(200).json({
    success: true,
    message: 'Profile updated',
    data: { user: user.toPublicJSON() },
  });
});

/** PATCH /api/v1/auth/password */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw AppError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');

  if (!(await user.comparePassword(currentPassword))) {
    throw AppError.badRequest('Your current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  }

  user.password = newPassword;
  // Changing a password ends every other session.
  user.refreshToken = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed — please sign in again on your other devices',
  });
});

/**
 * POST /api/v1/auth/forgot-password
 * Always reports success so the endpoint cannot confirm whether an email exists.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email });

  const genericResponse = {
    success: true,
    message: 'If that email belongs to an account, a reset link is on its way.',
  };

  if (!user || !user.isActive) {
    res.status(200).json(genericResponse);
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  // Email delivery is wired in the production-hardening phase. Until then the
  // token is surfaced in development only, never in production responses.
  if (!config.isProduction) {
    console.info(`[auth] password reset token for ${email}: ${resetToken}`);
  }

  res.status(200).json({
    ...genericResponse,
    ...(config.isProduction ? {} : { devResetToken: resetToken }),
  });
});

/** POST /api/v1/auth/reset-password */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = resetPasswordSchema.parse(req.body);

  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+password');

  if (!user) {
    throw AppError.badRequest(
      'This reset link is invalid or has expired. Request a new one.',
      'RESET_TOKEN_INVALID'
    );
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated — you can sign in now',
  });
});
