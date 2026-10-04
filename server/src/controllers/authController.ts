import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { User } from '../models/User.js';
// Registers the Branch schema. `getMe` populates `user.branch`, and Mongoose
// resolves populated model names at query time — an unimported model throws
// MissingSchemaError instead of degrading.
import '../models/Branch.js';
import { config } from '../config/index.js';
import { recordActivity } from '../services/events.js';
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

/**
 * Access tokens carry `typ: 'access'` and refresh tokens `typ: 'refresh'`.
 *
 * The two are signed with different secrets, so a token from one family already
 * fails verification in the other's endpoint. The explicit type claim makes that
 * guarantee independent of the secrets being distinct — a deployment mistake
 * (setting both secrets to the same value) would otherwise turn an access token
 * into a valid refresh token.
 *
 * The random `jti` is not decoration: `iat` has one-second resolution, so two
 * tokens signed for the same user in the same second are byte-identical without
 * it. That made token rotation a no-op for refresh tokens (see below) and left
 * access tokens distinguishable only by their second. Every issued token is now
 * unique by construction.
 */
function signAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role, typ: 'access', jti: crypto.randomBytes(16).toString('hex') },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions
  );
}

/**
 * Refresh tokens are signed the same way, and uniqueness is load-bearing here.
 *
 * Without a unique `jti`, rotation handed back the very token it was meant to
 * replace, `refreshToken` compared equal to itself, and the "rotated-away" token
 * stayed valid — so stolen-token detection silently did nothing whenever login
 * and refresh happened inside the same second.
 */
function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, typ: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
  );
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

  // Auditing is fire-and-forget: a failure to log must never block a sign-in.
  void recordActivity({
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: user.name },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
  });

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

  let payload: { sub: string; typ?: string };
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { sub: string; typ?: string };
  } catch {
    throw AppError.unauthorized('Your session has expired — please sign in again', 'REFRESH_INVALID');
  }

  // Reject any token that is not explicitly a refresh token.
  if (payload.typ && payload.typ !== 'refresh') {
    throw AppError.unauthorized('Your session is no longer valid', 'REFRESH_INVALID');
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

    void recordActivity({
      action: 'auth.logout',
      messageKey: 'activity.auth.logout',
      messageParams: { name: req.user.name },
      actor: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        branch: req.user.branch,
      },
    });
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

  void recordActivity({
    action: 'user.updated',
    messageKey: 'activity.user.updated',
    messageParams: { name: user.name, fields: Object.keys(updates).join(', ') },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    entityType: 'User',
    entityId: user._id,
    entityLabel: user.name,
  });

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

  void recordActivity({
    action: 'auth.password_changed',
    messageKey: 'activity.auth.passwordChanged',
    messageParams: { name: user.name },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    entityType: 'User',
    entityId: user._id,
    entityLabel: user.name,
  });

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
