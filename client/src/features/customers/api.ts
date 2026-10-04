import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type {
  Customer,
  CustomerPayload,
  CustomerQuery,
  Device,
  DevicePayload,
  DeviceQuery,
} from './types';

/**
 * Customer and device endpoints.
 *
 * List calls return `{ items, meta }` rather than a bare array so pagination is
 * never guessed at by the caller.
 */

export const customersApi = {
  list: async (query: CustomerQuery = {}): Promise<{ items: Customer[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<Customer[]>({
      method: 'GET',
      url: `/customers${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },

  get: (id: string) =>
    api.get<{ customer: Customer; devices: Device[] }>(`/customers/${id}`),

  create: (payload: CustomerPayload) =>
    api.post<{ customer: Customer }>('/customers', payload),

  update: (id: string, payload: Partial<CustomerPayload>) =>
    api.patch<{ customer: Customer }>(`/customers/${id}`, payload),

  archive: (id: string) =>
    api.delete<{ id: string; devicesDeactivated: number }>(`/customers/${id}`),
};

export const devicesApi = {
  list: async (query: DeviceQuery = {}): Promise<{ items: Device[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<Device[]>({
      method: 'GET',
      url: `/devices${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },

  get: (id: string) =>
    api.get<{ device: Device; customer: Customer | null }>(`/devices/${id}`),

  create: (payload: DevicePayload) => api.post<{ device: Device }>('/devices', payload),

  update: (id: string, payload: Partial<DevicePayload>) =>
    api.patch<{ device: Device }>(`/devices/${id}`, payload),

  archive: (id: string) => api.delete<{ id: string }>(`/devices/${id}`),
};
