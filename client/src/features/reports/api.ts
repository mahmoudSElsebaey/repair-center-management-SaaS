import { api } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { AnalyticsData } from './types';

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  branch?: string;
}

export const reportsApi = {
  /**
   * Revenue, payments, repairs and technician performance over a date range.
   * Branch-scoped by the API (super_admin may pass branch).
   */
  analytics: (query: AnalyticsQuery = {}) =>
    api.get<AnalyticsData>(`/reports/analytics${toQueryString(query)}`),
};
