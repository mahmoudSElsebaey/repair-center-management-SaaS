import type { QuotationLineType, QuotationStatus } from '@/types/domain';

export interface QuotationLine {
  type: QuotationLineType;
  description: string;
  quantity: number;
  unitPrice: number;
  inventoryItem: string | null;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  code: string;
  repairTicket: string;
  branch: string;
  customer: string;
  lines: QuotationLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  notes?: string;
  validUntil?: string;
  sentAt?: string;
  decidedAt?: string;
  decidedBy: string | null;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationPayload {
  lines: Array<{
    type: QuotationLineType;
    description: string;
    quantity: number;
    unitPrice: number;
    inventoryItem?: string | null;
  }>;
  tax?: number;
  notes?: string | null;
  validUntil?: string | null;
}

export interface DecideQuotationPayload {
  approved: boolean;
  rejectionReason?: string | null;
  note?: string | null;
}
