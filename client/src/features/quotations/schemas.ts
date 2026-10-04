import { z } from 'zod';
import { QUOTATION_LINE_TYPES } from '@/types/domain';

export const quotationLineSchema = z.object({
  type: z.enum(QUOTATION_LINE_TYPES),
  description: z.string().trim().min(2, 'quotations.validation.descriptionMin'),
  quantity: z.coerce.number().positive('quotations.validation.quantityPositive'),
  unitPrice: z.coerce.number().min(0, 'quotations.validation.unitPriceMin'),
  inventoryItem: z.string().optional().nullable(),
});

export const quotationFormSchema = z.object({
  lines: z.array(quotationLineSchema).min(1, 'quotations.validation.linesMin'),
  tax: z.coerce.number().min(0).optional().default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;
