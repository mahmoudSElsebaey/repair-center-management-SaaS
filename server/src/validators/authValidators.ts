import { z } from 'zod';
import { SUPPORTED_LOCALES, USER_ROLES } from '../types/domain.js';

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters');

/**
 * Opaque ObjectId check. Validation happens before the query so an invalid id
 * produces a clean 400 instead of a Mongoose CastError.
 */
export const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(10),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    avatar: z.string().trim().url('Avatar must be a valid URL').optional(),
    locale: z.enum(SUPPORTED_LOCALES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must differ from the current password',
    path: ['newPassword'],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is missing or invalid'),
  password,
});

/** Staff provisioning — used by the staff management screens from Phase 05. */
export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  phone: z.string().trim().max(30).optional(),
  password,
  role: z.enum(USER_ROLES),
  branch: objectId.optional(),
  locale: z.enum(SUPPORTED_LOCALES).default('ar'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
