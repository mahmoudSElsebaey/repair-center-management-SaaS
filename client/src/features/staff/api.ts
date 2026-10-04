import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type {
  CreateStaffPayload,
  StaffBranch,
  StaffMember,
  StaffQuery,
  UpdateStaffPayload,
} from './types';

export const staffApi = {
  list: async (query: StaffQuery = {}): Promise<{ items: StaffMember[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<StaffMember[]>({
      method: 'GET',
      url: `/staff${toQueryString(query as Record<string, string | number | undefined>)}`,
    });
    return { items: data ?? [], meta };
  },

  get: (id: string) => api.get<{ member: StaffMember }>(`/staff/${id}`),

  create: (payload: CreateStaffPayload) => api.post<{ member: StaffMember }>('/staff', payload),

  update: (id: string, payload: UpdateStaffPayload) =>
    api.patch<{ member: StaffMember }>(`/staff/${id}`, payload),

  workload: () => api.get<StaffMember[]>('/staff/technicians/workload'),

  branches: () => api.get<StaffBranch[]>('/staff/branches'),
};
