import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi } from './api';
import {
  fetchFailed,
  fetchStarted,
  fetchSucceeded,
  markAllRead as markAllReadAction,
  markRead as markReadAction,
  removeOne,
} from './notificationsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getErrorMessage } from '@/lib/utils';
import type { AppNotification } from './types';

const POLL_INTERVAL_MS = 60_000;

/**
 * Notification feed for the topbar bell and the notifications page.
 *
 * Polls gently rather than opening a socket: a repair centre has a handful of
 * concurrent users, and a 60-second refresh is indistinguishable from live for
 * this workload without adding persistent-connection infrastructure.
 */
export function useNotifications({ limit = 8, poll = true } = {}) {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.notifications.items);
  const unread = useAppSelector((state) => state.notifications.unread);
  const isLoading = useAppSelector((state) => state.notifications.isLoading);
  const loaded = useAppSelector((state) => state.notifications.loaded);
  const error = useAppSelector((state) => state.notifications.error);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) dispatch(fetchStarted());
      else setIsRefreshing(true);

      try {
        const result = await notificationsApi.list({ limit });
        if (!mounted.current) return;
        dispatch(fetchSucceeded({ items: result.items, unread: result.unread }));
      } catch (caught) {
        if (!mounted.current) return;
        dispatch(fetchFailed(getErrorMessage(caught, 'Could not load notifications')));
      } finally {
        if (mounted.current) setIsRefreshing(false);
      }
    },
    [dispatch, limit]
  );

  useEffect(() => {
    mounted.current = true;
    void load();

    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Polling pauses while the tab is hidden — no point fetching for nobody.
  useEffect(() => {
    if (!poll) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [load, poll]);

  const markRead = useCallback(
    async (id: string) => {
      dispatch(markReadAction(id));
      try {
        await notificationsApi.markRead(id);
      } catch {
        // Re-sync rather than leaving an optimistic lie on screen.
        void load(true);
      }
    },
    [dispatch, load]
  );

  const markAllRead = useCallback(async () => {
    dispatch(markAllReadAction());
    try {
      await notificationsApi.markAllRead();
    } catch {
      void load(true);
    }
  }, [dispatch, load]);

  const remove = useCallback(
    async (id: string) => {
      dispatch(removeOne(id));
      try {
        await notificationsApi.remove(id);
      } catch {
        void load(true);
      }
    },
    [dispatch, load]
  );

  return {
    items: items as AppNotification[],
    unread,
    isLoading,
    isRefreshing,
    loaded,
    error,
    reload: () => load(true),
    markRead,
    markAllRead,
    remove,
  };
}
