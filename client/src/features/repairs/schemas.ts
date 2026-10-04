import { z } from 'zod';

/** Repair ticket form contracts. */

export const PRIORITY_VALUES = ['low', 'normal', 'high', 'urgent'] as const;

export const createRepairFormSchema = z.object({
  /** Device id, chosen through the searchable picker. */
  device: z.string().min(1, { message: 'repairs.validation.deviceRequired' }),
  priority: z.enum(PRIORITY_VALUES),
  /**
   * Optional: when left empty the server defaults to the fault recorded at
   * device intake, which is what the counter actually heard.
   */
  issue: z
    .string()
    .trim()
    .max(2000, { message: 'validation.max' })
    .optional()
    .or(z.literal('')),
  technician: z.string().optional().or(z.literal('')),
  estimatedCost: z
    .union([z.coerce.number().min(0).max(10_000_000), z.literal('')])
    .optional(),
  warrantyDays: z.coerce.number().int().min(0).max(3650),
  expectedCompletionAt: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type CreateRepairFormValues = z.infer<typeof createRepairFormSchema>;

export const updateRepairFormSchema = z.object({
  issue: z
    .string()
    .trim()
    .min(5, { message: 'repairs.validation.issueMin' })
    .max(2000, { message: 'validation.max' }),
  diagnosis: z.string().trim().max(2000).optional().or(z.literal('')),
  priority: z.enum(PRIORITY_VALUES),
  estimatedCost: z.union([z.coerce.number().min(0).max(10_000_000), z.literal('')]).optional(),
  finalCost: z.union([z.coerce.number().min(0).max(10_000_000), z.literal('')]).optional(),
  technician: z.string().optional().or(z.literal('')),
  warrantyDays: z.coerce.number().int().min(0).max(3650),
  expectedCompletionAt: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type UpdateRepairFormValues = z.infer<typeof updateRepairFormSchema>;

/** Converts an empty string from a number input into `undefined`. */
export function optionalNumber(value: number | '' | undefined): number | undefined {
  if (value === '' || value === undefined || value === null) return undefined;
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}
