import type { InventoryCategory, InventoryTransactionType } from '@/types/domain';

export type { InventoryCategory, InventoryTransactionType };

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  brand?: string;
  unit: string;
  quantityOnHand: number;
  minQuantity: number;
  unitCost: number;
  sellPrice: number;
  location?: string;
  supplier?: string;
  notes?: string;
  branch: string;
  isActive: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  item: string;
  branch: string;
  type: InventoryTransactionType;
  quantity: number;
  direction?: 'in' | 'out';
  unitCost?: number;
  balanceAfter: number;
  repairTicket?: string;
  notes?: string;
  performedBy?: string;
  performedByName?: string;
  createdAt: string;
}

export interface InventoryItemPayload {
  name: string;
  category: InventoryCategory;
  brand?: string;
  unit?: string;
  quantityOnHand?: number;
  minQuantity?: number;
  unitCost?: number;
  sellPrice?: number;
  location?: string;
  supplier?: string;
  notes?: string;
  branch?: string;
  isActive?: boolean;
}

export interface StockMovementPayload {
  type: InventoryTransactionType;
  quantity: number;
  direction?: 'in' | 'out';
  unitCost?: number;
  notes?: string;
  repairTicket?: string;
}

export interface InventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: InventoryCategory;
  lowStock?: 'true' | 'false';
  isActive?: 'true' | 'false';
  sort?: string;
}
