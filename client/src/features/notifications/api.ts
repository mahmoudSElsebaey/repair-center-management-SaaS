import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type { AppNotification, NotificationListResult } from './types';

export const notificationsApi = {
  list: async (
    query: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<{ items: AppNotification[]; unread: number; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<NotificationListResult>({
      method: 'GET',
      url: `/notifications${toQueryString({
        page: query.page,
        limit: query.limit,
        unreadOnly: query.unreadOnly ? 'true' : undefined,
      })}`,
    });

    return { items: data?.items ?? [], unread: data?.unread ?? 0, meta };
  },

  summary: () => api.get<{ unread: number; total: number }>('/notifications/summary'),

  markRead: (id: string) => api.patch<{ notification: AppNotification }>(`/notifications/${id}/read`),

  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),

  remove: (id: string) => api.delete<null>(`/notifications/${id}`),
};
