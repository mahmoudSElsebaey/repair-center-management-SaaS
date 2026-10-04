import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type {
  AssignableTechnician,
  ChangeStatusPayload,
  CreateRepairPayload,
  RepairDetail,
  RepairQuery,
  RepairSummary,
  RepairTicket,
  UpdateRepairPayload,
} from './types';

export const repairsApi = {
  list: async (query: RepairQuery = {}): Promise<{ items: RepairTicket[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<RepairTicket[]>({
      method: 'GET',
      url: `/repairs${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },

  get: (id: string) => api.get<RepairDetail>(`/repairs/${id}`),

  create: (payload: CreateRepairPayload) => api.post<{ ticket: RepairTicket }>('/repairs', payload),

  update: (id: string, payload: UpdateRepairPayload) =>
    api.patch<{ ticket: RepairTicket }>(`/repairs/${id}`, payload),

  /**
   * The only way a ticket's status changes. The server validates the move against
   * the workflow table and rejects anything undefined, out of role, or missing
   * required information.
   */
  changeStatus: (id: string, payload: ChangeStatusPayload) =>
    api.patch<{ ticket: RepairTicket }>(`/repairs/${id}/status`, payload),

  summary: () => api.get<RepairSummary>('/repairs/summary'),

  technicians: () => api.get<AssignableTechnician[]>('/repairs/technicians'),
};
