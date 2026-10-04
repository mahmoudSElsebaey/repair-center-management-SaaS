import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';

/**
 * Paginated list loader shared by every table screen.
 *
 * Owns the three things a list always needs: debounced search, page state, and
 * a fetch that never races itself. When the search term changes the page resets
 * to 1 — otherwise a search run from page 3 would look empty for no reason the
 * user can see.
 *
 * `fetcher` must be stable (wrap it in `useCallback`) or passed inline with the
 * dependencies it closes over, since it drives the effect.
 */
export function usePaginatedList<T>(
  fetcher: (params: { page: number; limit: number; search: string }) => Promise<{
    items: T[];
    meta?: PaginationMeta;
  }>,
  { limit = 20, debounceMs = 350 }: { limit?: number; debounceMs?: number } = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Guards against an older response overwriting a newer one. */
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [search, debounceMs]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current({ page, limit, search: debouncedSearch });
      if (id !== requestId.current) return;
      setItems(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(getErrorMessage(caught, 'Could not load this list'));
      setItems([]);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    meta,
    page,
    limit,
    search,
    setSearch,
    setPage,
    isLoading,
    error,
    reload: load,
    /** Removes one row locally so a delete does not need a full refetch. */
    removeLocal: (id: string) =>
      setItems((current) => current.filter((item) => (item as { id?: string }).id !== id)),
  };
}
