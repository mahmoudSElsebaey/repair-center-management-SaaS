import { z } from 'zod';
import { PAYMENT_METHODS } from '@/types/domain';

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export type RecordPaymentForm = z.infer<typeof recordPaymentSchema>;
