import { z } from 'zod';
import { USER_ROLES } from '@/types/domain';

const assignable = USER_ROLES.filter((r) => r !== 'super_admin') as [string, ...string[]];

export const createStaffFormSchema = z.object({
  name: z.string().trim().min(2, { message: 'staff.validation.nameMin' }),
  email: z.string().trim().email({ message: 'staff.validation.email' }),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8, { message: 'staff.validation.passwordMin' }),
  role: z.enum(assignable),
  branch: z.string().optional().or(z.literal('')),
  locale: z.enum(['ar', 'en']).optional(),
});

export const updateStaffFormSchema = z.object({
  name: z.string().trim().min(2, { message: 'staff.validation.nameMin' }),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  role: z.enum(assignable),
  branch: z.string().optional().or(z.literal('')),
  locale: z.enum(['ar', 'en']).optional(),
  password: z
    .string()
    .min(8, { message: 'staff.validation.passwordMin' })
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional(),
});

export type CreateStaffFormValues = z.infer<typeof createStaffFormSchema>;
export type UpdateStaffFormValues = z.infer<typeof updateStaffFormSchema>;
