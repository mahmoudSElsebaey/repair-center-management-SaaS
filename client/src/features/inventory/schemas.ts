import { z } from 'zod';
import { INVENTORY_CATEGORIES, INVENTORY_TRANSACTION_TYPES } from '@/types/domain';

export const inventoryItemFormSchema = z.object({
  name: z.string().trim().min(2, 'validation.nameMin').max(160),
  category: z.enum(INVENTORY_CATEGORIES, { required_error: 'validation.required' }),
  brand: z.string().trim().max(80).optional().or(z.literal('')),
  unit: z.string().trim().max(30).default('pcs'),
  quantityOnHand: z.coerce.number().min(0, 'validation.min').default(0),
  minQuantity: z.coerce.number().min(0, 'validation.min').default(2),
  unitCost: z.coerce.number().min(0, 'validation.min').default(0),
  sellPrice: z.coerce.number().min(0, 'validation.min').default(0),
  location: z.string().trim().max(60).optional().or(z.literal('')),
  supplier: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const stockMovementFormSchema = z
  .object({
    type: z.enum(INVENTORY_TRANSACTION_TYPES, { required_error: 'validation.required' }),
    quantity: z.coerce.number().positive('validation.min'),
    direction: z.enum(['in', 'out']).optional(),
    unitCost: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'adjustment' && !value.direction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required',
        path: ['direction'],
      });
    }
  });

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;
export type StockMovementFormValues = z.infer<typeof stockMovementFormSchema>;
