import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type { ActivityEntry, ActivityQuery } from './types';

export const activityApi = {
  list: async (
    query: ActivityQuery = {}
  ): Promise<{ items: ActivityEntry[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<ActivityEntry[]>({
      method: 'GET',
      url: `/activity${toQueryString(query as Record<string, string | number | undefined>)}`,
    });

    return { items: data ?? [], meta };
  },
};

export { api };
