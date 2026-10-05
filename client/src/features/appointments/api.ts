import { api, requestWithMeta } from '@/lib/apiClient';
import { toQueryString } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';
import type {
  Appointment,
  AppointmentDetail,
  AppointmentQuery,
  CalendarQuery,
  ConflictResult,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from './types';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

function asQuery(params: object): QueryParams {
  return params as unknown as QueryParams;
}

export const appointmentsApi = {
  list: async (
    query: AppointmentQuery = {}
  ): Promise<{ items: Appointment[]; meta?: PaginationMeta }> => {
    const { data, meta } = await requestWithMeta<Appointment[]>({
      method: 'GET',
      url: `/appointments${toQueryString(asQuery(query))}`,
    });
    return { items: data ?? [], meta };
  },

  calendar: (query: CalendarQuery) =>
    api.get<Appointment[]>(
      `/appointments/calendar${toQueryString(asQuery(query))}`
    ),

  get: (id: string) => api.get<AppointmentDetail>(`/appointments/${id}`),

  create: (payload: CreateAppointmentPayload) =>
    api.post<AppointmentDetail>('/appointments', payload),

  update: (id: string, payload: UpdateAppointmentPayload) =>
    api.patch<AppointmentDetail>(`/appointments/${id}`, payload),

  confirm: (id: string) => api.post<AppointmentDetail>(`/appointments/${id}/confirm`),

  complete: (id: string) => api.post<AppointmentDetail>(`/appointments/${id}/complete`),

  cancel: (id: string, reason?: string | null) =>
    api.post<AppointmentDetail>(`/appointments/${id}/cancel`, { reason: reason ?? null }),

  noShow: (id: string) => api.post<AppointmentDetail>(`/appointments/${id}/no-show`),

  conflicts: (params: {
    technicianId: string;
    startsAt: string;
    endsAt: string;
    excludeId?: string;
  }) =>
    api.get<ConflictResult>(
      `/appointments/conflicts${toQueryString(asQuery(params))}`
    ),
};
