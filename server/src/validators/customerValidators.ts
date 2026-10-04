import { z } from 'zod';
import { DEVICE_TYPES, SUPPORTED_LOCALES } from '../types/domain.js';
import { DEVICE_CONDITIONS } from '../models/Device.js';
import { objectId } from './authValidators.js';

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Phone numbers are stored exactly as typed, because staff read them back to the
 * customer. Validation therefore checks the useful shape — enough digits to be
 * dialable — without rewriting the value.
 */
const phone = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .min(7, 'Phone number is too short')
  .max(30, 'Phone number is too long')
  .refine((value) => (value.match(/\d/g) ?? []).length >= 7, {
    message: 'Enter a valid phone number',
  });

const optionalPhone = z
  .string()
  .trim()
  .max(30, 'Phone number is too long')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value));

/* -------------------------------------------------------------------------- */
/* Customer                                                                    */
/* -------------------------------------------------------------------------- */

export const createCustomerSchema = z.object({
  name: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),
  phone,
  phoneAlt: optionalPhone,
  email: optionalEmail,
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  preferredLanguage: z.enum(SUPPORTED_LOCALES).default('ar'),
  branch: objectId.optional(),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  branch: objectId.optional(),
  city: z.string().trim().max(80).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sort: z.enum(['name', '-name', 'createdAt', '-createdAt', 'lastVisitAt', '-lastVisitAt']).optional(),
});

/* -------------------------------------------------------------------------- */
/* Device                                                                      */
/* -------------------------------------------------------------------------- */

export const deviceImageSchema = z.object({
  url: z.string().trim().url('Image URL is invalid'),
  publicId: z.string().trim().max(200).optional(),
  caption: z.string().trim().max(200).optional(),
});

export const createDeviceSchema = z.object({
  customer: objectId,
  deviceType: z.enum(DEVICE_TYPES, {
    required_error: 'Device type is required',
    invalid_type_error: 'Choose a valid device type',
  }),
  brand: z
    .string({ required_error: 'Brand is required' })
    .trim()
    .min(1, 'Brand is required')
    .max(60),
  model: z
    .string({ required_error: 'Model is required' })
    .trim()
    .min(1, 'Model is required')
    .max(120),
  serialNumber: z.string().trim().max(80).optional(),
  imei: z.string().trim().max(40).optional(),
  color: z.string().trim().max(40).optional(),
  condition: z.enum(DEVICE_CONDITIONS).default('good'),
  accessories: z.array(z.string().trim().max(60)).max(20).default([]),
  reportedIssue: z
    .string({ required_error: 'Describe the reported issue' })
    .trim()
    .min(5, 'Describe the issue in at least 5 characters')
    .max(2000),
  unlockCode: z.string().trim().max(60).optional(),
  images: z.array(deviceImageSchema).max(12).default([]),
  notes: z.string().trim().max(2000).optional(),
});

export const updateDeviceSchema = createDeviceSchema
  .omit({ customer: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listDevicesQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  customer: objectId.optional(),
  branch: objectId.optional(),
  deviceType: z.enum(DEVICE_TYPES).optional(),
  condition: z.enum(DEVICE_CONDITIONS).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sort: z
    .enum(['createdAt', '-createdAt', 'brand', '-brand', 'model', '-model'])
    .optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
