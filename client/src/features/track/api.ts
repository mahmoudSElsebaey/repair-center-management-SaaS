import { api } from '@/lib/apiClient';
import type { PublicTrackData } from './types';

/**
 * Public tracking API — no authentication.
 * Code is the only credential; server rate-limits lookups.
 */
export const trackApi = {
  get: (code: string) =>
    api.get<PublicTrackData>(`/track/${encodeURIComponent(code.trim())}`, {
      skipAuth: true,
    }),
};
