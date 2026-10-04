import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type {
  InventoryItem,
  InventoryItemPayload,
  InventoryQuery,
  InventoryTransaction,
  StockMovementPayload,
} from './types';

export const inventoryApi = {
  list: async (
    query: InventoryQuery = {}
  ): Promise<{ items: InventoryItem[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<InventoryItem[]>({
      method: 'GET',
      url: `/inventory${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },

  get: (id: string) =>
    api.get<{ item: InventoryItem; transactions: InventoryTransaction[] }>(`/inventory/${id}`),

  create: (payload: InventoryItemPayload) =>
    api.post<{ item: InventoryItem }>('/inventory', payload),

  update: (id: string, payload: Partial<InventoryItemPayload>) =>
    api.patch<{ item: InventoryItem }>(`/inventory/${id}`, payload),

  archive: (id: string) => api.delete<{ id: string }>(`/inventory/${id}`),

  recordMovement: (id: string, payload: StockMovementPayload) =>
    api.post<{ item: InventoryItem; transaction: InventoryTransaction }>(
      `/inventory/${id}/transactions`,
      payload
    ),

  listTransactions: async (
    id: string,
    query: { page?: number; limit?: number; type?: string } = {}
  ): Promise<{ items: InventoryTransaction[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<InventoryTransaction[]>({
      method: 'GET',
      url: `/inventory/${id}/transactions${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },

  lowStock: () => api.get<InventoryItem[]>('/inventory/low-stock'),
};
