import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type {
  CreateInvoicePayload,
  Invoice,
  InvoiceDetail,
  InvoiceQuery,
  Payment,
  PaymentQuery,
  RecordPaymentPayload,
} from './types';

export const invoicesApi = {
  list: async (
    query: InvoiceQuery = {}
  ): Promise<{ items: Invoice[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<Invoice[]>({
      method: 'GET',
      url: `/invoices${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },

  get: (id: string) => api.get<InvoiceDetail>(`/invoices/${id}`),

  create: (payload: CreateInvoicePayload) =>
    api.post<{ invoice: Invoice }>('/invoices', payload),

  issue: (id: string) => api.post<{ invoice: Invoice }>(`/invoices/${id}/issue`),

  void: (id: string) => api.post<{ invoice: Invoice }>(`/invoices/${id}/void`),

  recordPayment: (id: string, payload: RecordPaymentPayload) =>
    api.post<{ payment: Payment; invoice: Invoice }>(`/invoices/${id}/payments`, payload),

  listPayments: async (
    query: PaymentQuery = {}
  ): Promise<{ items: Payment[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<Payment[]>({
      method: 'GET',
      url: `/invoices/payments${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },
};
