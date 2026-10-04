import { api } from '@/lib/apiClient';
import type { DecideQuotationPayload, Quotation, QuotationPayload } from './types';

export const quotationsApi = {
  get: (repairId: string) =>
    api.get<{
      quotation: Quotation | null;
      ticket: {
        id: string;
        code: string;
        status: string;
        estimatedCost?: number;
        customerApproved?: boolean;
      };
    }>(`/repairs/${repairId}/quotation`),

  save: (repairId: string, payload: QuotationPayload) =>
    api.put<{ quotation: Quotation }>(`/repairs/${repairId}/quotation`, payload),

  send: (repairId: string) =>
    api.post<{ quotation: Quotation; ticketStatus: string }>(
      `/repairs/${repairId}/quotation/send`,
      {}
    ),

  decide: (repairId: string, payload: DecideQuotationPayload) =>
    api.post<{
      quotation: Quotation;
      ticketStatus: string;
      customerApproved?: boolean;
    }>(`/repairs/${repairId}/quotation/decide`, payload),
};
