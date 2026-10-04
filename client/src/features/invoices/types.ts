import type { InvoiceStatus, PaymentMethod } from '@/types/domain';

export interface InvoiceLine {
  type: 'labor' | 'part' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  number: string;
  repairTicket: string | null;
  repairCode: string | null;
  customer: string;
  branch: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  notes: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoice: string;
  invoiceNumber: string | null;
  branch: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  recordedBy: string | null;
  recordedByName: string | null;
  createdAt: string;
}

export interface InvoiceDetailCustomer {
  id: string;
  name: string;
  phone: string;
  customerCode: string;
}

export interface InvoiceDetail {
  invoice: Invoice;
  payments: Payment[];
  customer: InvoiceDetailCustomer | null;
}

export interface InvoiceQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus | '';
  customerId?: string;
  repairTicketId?: string;
  sort?: string;
}

export interface PaymentQuery {
  page?: number;
  limit?: number;
  search?: string;
  method?: PaymentMethod | '';
  invoiceId?: string;
  sort?: string;
}

export interface CreateInvoicePayload {
  repairTicketId?: string;
  customerId?: string;
  lines?: Array<{
    type: 'labor' | 'part' | 'other';
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  tax?: number;
  discount?: number;
  notes?: string | null;
  issueImmediately?: boolean;
}

export interface RecordPaymentPayload {
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string;
}
