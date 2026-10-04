import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type { DashboardData } from './types';

export const dashboardApi = {
  /** Aggregated operations snapshot, branch-scoped by the API. */
  get: (branchId?: string) =>
    api.get<DashboardData>(`/reports/dashboard${toQueryString({ branch: branchId })}`),
};

export interface DashboardResult {
  data: DashboardData;
  meta?: PaginationMeta;
}

export { requestWithMeta };
