import { z } from 'zod';

/**
 * Form contracts. These are intentionally separate from the server validators:
 * the server is authoritative, while these drive inline, localised feedback
 * before a request is ever sent.
 *
 * Messages are i18n keys, resolved by the form layer, so Arabic and English
 * users see the same rules with their own wording.
 */

export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'validation.required' })
    .email({ message: 'validation.email' }),
  password: z
    .string()
    .min(1, { message: 'validation.required' })
    .min(8, { message: 'validation.passwordMin' }),
  remember: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'validation.required' })
    .email({ message: 'validation.email' }),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export const resetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(1, { message: 'validation.required' })
      .min(8, { message: 'validation.passwordMin' })
      .regex(/[A-Za-z]/, { message: 'validation.passwordLetter' })
      .regex(/[0-9]/, { message: 'validation.passwordNumber' }),
    confirmPassword: z.string().min(1, { message: 'validation.required' }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export const profileFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'validation.required' })
    .min(2, { message: 'validation.nameMin' })
    .max(100, { message: 'validation.nameMax' }),
  phone: z
    .string()
    .max(30, { message: 'validation.phoneMax' })
    .optional()
    .or(z.literal('')),
  locale: z.enum(['ar', 'en']),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'validation.required' }),
    newPassword: z
      .string()
      .min(1, { message: 'validation.required' })
      .min(8, { message: 'validation.passwordMin' }),
    confirmPassword: z.string().min(1, { message: 'validation.required' }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
