import { z } from 'zod';
import { QUOTATION_LINE_TYPES } from '../types/domain.js';

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

const quotationLineSchema = z.object({
  type: z.enum(QUOTATION_LINE_TYPES, {
    required_error: 'Choose a line type',
    invalid_type_error: 'That line type does not exist',
  }),
  description: z
    .string()
    .trim()
    .min(2, 'Describe the line item')
    .max(300, 'Description is too long'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero').max(10_000),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative').max(1_000_000),
  inventoryItem: objectId.optional().nullable(),
});

export const upsertQuotationSchema = z.object({
  lines: z
    .array(quotationLineSchema)
    .min(1, 'Add at least one line')
    .max(40, 'A quotation cannot have more than 40 lines'),
  tax: z.coerce.number().min(0).max(1_000_000).optional().default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
});

export const decideQuotationSchema = z
  .object({
    approved: z.boolean({
      required_error: 'Say whether the customer approved',
    }),
    rejectionReason: z.string().trim().max(500).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.approved === false && !value.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Record why the customer declined',
      });
    }
  });

export type UpsertQuotationInput = z.infer<typeof upsertQuotationSchema>;
export type DecideQuotationInput = z.infer<typeof decideQuotationSchema>;
