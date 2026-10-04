/**
 * Single source of truth for cross-cutting domain vocabulary.
 * Controllers, models, validators and the seed system all read from here,
 * so a new role or device type is added in exactly one place.
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

export const ROLE_LABELS: Record<UserRole, { en: string; ar: string }> = {
  super_admin: { en: 'Super Admin', ar: 'مدير النظام' },
  admin: { en: 'Administrator', ar: 'مسؤول' },
  manager: { en: 'Branch Manager', ar: 'مدير فرع' },
  technician: { en: 'Technician', ar: 'فني' },
  receptionist: { en: 'Receptionist', ar: 'موظف استقبال' },
  inventory_manager: { en: 'Inventory Manager', ar: 'مسؤول مخزون' },
};

export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

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

/** Core business workflow. Phase 04 turns this into a validated state machine. */
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

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'wallet'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Quotation lifecycle. A ticket cannot enter `in_repair` without an approved quotation. */
export const QUOTATION_STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_LINE_TYPES = ['labor', 'part', 'other'] as const;
export type QuotationLineType = (typeof QUOTATION_LINE_TYPES)[number];

/** Roles allowed to reach administrative surfaces. */
export const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'manager'];
