import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardApi } from './api';
import { ApiError } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/utils';
import type { DashboardData } from './types';

export type DashboardStatus = 'loading' | 'ready' | 'error';

/**
 * Loads the operations snapshot.
 *
 * `notReady` distinguishes "this data does not exist yet in the product" from a
 * real failure. A section whose phase has not shipped returns 403 for roles
 * without reporting access and 200 with `sections` flags otherwise; the caller
 * renders honestly in both cases instead of showing an error for something that
 * is simply not built.
 */
export function useDashboard(branchId?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setNotReady(false);

    try {
      const result = await dashboardApi.get(branchId);
      if (!mounted.current) return;
      setData(result);
      setStatus('ready');
    } catch (caught) {
      if (!mounted.current) return;

      // 403 means this role has no reporting access, which is a permission
      // outcome rather than a failure the user can act on.
      if (caught instanceof ApiError && (caught.isForbidden || caught.isUnauthorized)) {
        setNotReady(true);
        setStatus('ready');
        return;
      }

      setError(getErrorMessage(caught, 'Could not load the dashboard'));
      setStatus('error');
    }
  }, [branchId]);

  useEffect(() => {
    mounted.current = true;
    void load();

    return () => {
      mounted.current = false;
    };
  }, [load]);

  return { data, status, error, notReady, reload: load };
}
