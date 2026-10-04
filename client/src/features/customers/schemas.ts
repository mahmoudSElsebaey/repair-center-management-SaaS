import { z } from 'zod';

/**
 * Customer and device form contracts.
 *
 * Messages are i18n keys resolved by the form layer, so the rules live here once
 * and read in the user's own language. The server validates independently — this
 * only prevents a pointless round trip.
 */

const optionalText = (max: number) =>
  z.string().trim().max(max, { message: 'validation.max' }).optional().or(z.literal(''));

export const customerFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'customers.validation.nameRequired' })
    .min(2, { message: 'validation.nameMin' })
    .max(120, { message: 'validation.nameMax' }),
  phone: z
    .string()
    .min(1, { message: 'customers.validation.phoneRequired' })
    .min(7, { message: 'customers.validation.phoneInvalid' })
    .max(30, { message: 'validation.phoneMax' })
    .refine((value) => (value.match(/\d/g) ?? []).length >= 7, {
      message: 'customers.validation.phoneInvalid',
    }),
  phoneAlt: optionalText(30),
  email: z
    .string()
    .trim()
    .email({ message: 'customers.validation.emailInvalid' })
    .optional()
    .or(z.literal('')),
  city: optionalText(80),
  address: optionalText(300),
  notes: optionalText(2000),
  preferredLanguage: z.enum(['ar', 'en']),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const DEVICE_TYPE_VALUES = [
  'smartphone',
  'laptop',
  'tablet',
  'desktop',
  'tv',
  'appliance',
  'ac',
  'other',
] as const;

export const DEVICE_CONDITION_VALUES = ['excellent', 'good', 'fair', 'poor', 'damaged'] as const;

export const deviceFormSchema = z.object({
  customer: z.string().min(1, { message: 'devices.validation.customerRequired' }),
  deviceType: z.enum(DEVICE_TYPE_VALUES),
  brand: z
    .string()
    .min(1, { message: 'devices.validation.brandRequired' })
    .max(60, { message: 'validation.max' }),
  model: z
    .string()
    .min(1, { message: 'devices.validation.modelRequired' })
    .max(120, { message: 'validation.max' }),
  serialNumber: optionalText(80),
  imei: optionalText(40),
  color: optionalText(40),
  condition: z.enum(DEVICE_CONDITION_VALUES),
  /** Entered as free text, split on commas before it reaches the API. */
  accessoriesText: optionalText(400),
  reportedIssue: z
    .string()
    .min(1, { message: 'devices.validation.issueRequired' })
    .min(5, { message: 'devices.validation.issueMin' })
    .max(2000, { message: 'validation.max' }),
  unlockCode: optionalText(60),
  notes: optionalText(2000),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;

/** `"a, b , c"` → `['a', 'b', 'c']`, dropping blanks and duplicates. */
export function parseAccessories(input: string | undefined): string[] {
  if (!input) return [];
  return [...new Set(input.split(',').map((part) => part.trim()).filter(Boolean))];
}
