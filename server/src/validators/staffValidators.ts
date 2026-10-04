import { z } from 'zod';
import { SUPPORTED_LOCALES, USER_ROLES } from '../types/domain.js';
import { objectId } from './authValidators.js';

/** Every role except super_admin may be assigned through the staff API. */
const ASSIGNABLE_ROLES = [
  'admin',
  'manager',
  'technician',
  'receptionist',
  'inventory_manager',
] as const;

export const listStaffQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  branch: objectId.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sort: z.string().trim().max(40).optional(),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(100),
  role: z.enum(ASSIGNABLE_ROLES),
  branch: objectId.optional().nullable(),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
});

export const updateStaffSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    role: z.enum(ASSIGNABLE_ROLES).optional(),
    branch: objectId.optional().nullable(),
    locale: z.enum(SUPPORTED_LOCALES).optional(),
    password: z.string().min(8).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });
