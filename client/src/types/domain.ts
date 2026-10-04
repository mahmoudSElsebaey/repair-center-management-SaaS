/** Roles are mirrored exactly from the API (`server/src/types/domain.ts`). */
export const USER_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'technician',
  'receptionist',
  'inventory_manager',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'manager'];

/** Roles allowed to reach the operations console at all. */
export const STAFF_ROLES: UserRole[] = [...USER_ROLES];

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

export const REPAIR_HAPPY_PATH: RepairStatus[] = [
  'received',
  'diagnosing',
  'waiting_customer',
  'approved',
  'in_repair',
  'ready',
  'delivered',
];

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
