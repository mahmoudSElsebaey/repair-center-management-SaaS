/**
 * Client-side domain vocabulary — mirrored from server/src/types/domain.ts.
 * Any change here must land in the same commit as the server file.
 */

export const USER_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'technician',
  'receptionist',
  'inventory_manager',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEVICE_TYPES = [
  'smartphone',
  'laptop',
  'tablet',
  'desktop',
  'tv',
  'appliance',
  'ac',
  'other',
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const REPAIR_STATUSES = [
  'received',
  'diagnosing',
  'waiting_customer',
  'approved',
  'in_repair',
  'waiting_parts',
  'ready',
  'delivered',
  'cancelled',
] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const REPAIR_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type RepairPriority = (typeof REPAIR_PRIORITIES)[number];

export const INVENTORY_TRANSACTION_TYPES = [
  'purchase',
  'usage',
  'return',
  'adjustment',
  'transfer',
] as const;
export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];

export const INVENTORY_CATEGORIES = [
  'screen',
  'battery',
  'cable',
  'connector',
  'board',
  'tool',
  'adhesive',
  'case',
  'other',
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export type Theme = 'light' | 'dark';
export type Locale = 'ar' | 'en';

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'wallet'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const QUOTATION_STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_LINE_TYPES = ['labor', 'part', 'other'] as const;
export type QuotationLineType = (typeof QUOTATION_LINE_TYPES)[number];

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
