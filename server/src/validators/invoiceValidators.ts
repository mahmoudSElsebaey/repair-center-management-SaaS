import { z } from 'zod';
import { INVOICE_LINE_TYPES, INVOICE_STATUSES } from '../models/Invoice.js';
import { PAYMENT_METHODS } from '../models/Payment.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const lineSchema = z.object({
  type: z.enum(INVOICE_LINE_TYPES),
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().positive().max(100_000),
  unitPrice: z.coerce.number().min(0).max(10_000_000),
});

export const createInvoiceSchema = z
  .object({
    repairTicketId: objectId.optional(),
    customerId: objectId.optional(),
    lines: z.array(lineSchema).min(1).max(50).optional(),
    tax: z.coerce.number().min(0).max(10_000_000).optional(),
    discount: z.coerce.number().min(0).max(10_000_000).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    issueImmediately: z.boolean().optional(),
  })
  .refine((data) => data.repairTicketId || (data.customerId && data.lines && data.lines.length > 0), {
    message: 'Provide a repair ticket id, or a customer with at least one line',
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive().max(10_000_000),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  paidAt: z.coerce.date().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  customerId: objectId.optional(),
  repairTicketId: objectId.optional(),
  sort: z.string().optional(),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  invoiceId: objectId.optional(),
  sort: z.string().optional(),
});
