import { z } from 'zod';
import { INVENTORY_TRANSACTION_TYPES } from '../types/domain.js';
import { INVENTORY_CATEGORIES } from '../models/InventoryItem.js';
import { objectId } from './authValidators.js';

const nonNeg = z.coerce.number().min(0, 'Value cannot be negative');
const positiveQty = z.coerce.number().positive('Quantity must be greater than zero');

export const createInventoryItemSchema = z.object({
  name: z
    .string({ required_error: 'Part name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(160),
  category: z.enum(INVENTORY_CATEGORIES, {
    required_error: 'Category is required',
    invalid_type_error: 'Choose a valid category',
  }),
  brand: z.string().trim().max(80).optional().or(z.literal('')).transform((v) => v || undefined),
  unit: z.string().trim().max(30).default('pcs'),
  quantityOnHand: nonNeg.default(0),
  minQuantity: nonNeg.default(2),
  unitCost: nonNeg.default(0),
  sellPrice: nonNeg.default(0),
  location: z.string().trim().max(60).optional().or(z.literal('')).transform((v) => v || undefined),
  supplier: z.string().trim().max(120).optional().or(z.literal('')).transform((v) => v || undefined),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).transform((v) => v || undefined),
  branch: objectId.optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema
  .omit({ quantityOnHand: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listInventoryQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  branch: objectId.optional(),
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sort: z
    .enum([
      'name',
      '-name',
      'sku',
      '-sku',
      'quantityOnHand',
      '-quantityOnHand',
      'createdAt',
      '-createdAt',
    ])
    .optional(),
});

export const createTransactionSchema = z
  .object({
    type: z.enum(INVENTORY_TRANSACTION_TYPES, {
      required_error: 'Transaction type is required',
    }),
    quantity: positiveQty,
    direction: z.enum(['in', 'out']).optional(),
    unitCost: nonNeg.optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal('')).transform((v) => v || undefined),
    repairTicket: objectId.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'adjustment' && !value.direction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adjustment requires a direction (in or out)',
        path: ['direction'],
      });
    }
  });

export const listTransactionsQuerySchema = z.object({
  type: z.enum(INVENTORY_TRANSACTION_TYPES).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
