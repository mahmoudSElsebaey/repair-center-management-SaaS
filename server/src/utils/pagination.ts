/**
 * Shared pagination helpers.
 *
 * Every list endpoint accepts the same `page`/`limit` parameters and returns the
 * same `meta` block, so the client's table layer works against all of them
 * without per-endpoint special cases.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Parses and clamps `page` and `limit` from a query string. */
export function parsePagination(query: unknown, defaultLimit = DEFAULT_PAGE_SIZE) {
  const raw = (query ?? {}) as Record<string, unknown>;

  const limit = Math.min(
    Math.max(Number.parseInt(String(raw.limit ?? defaultLimit), 10) || defaultLimit, 1),
    MAX_PAGE_SIZE
  );

  const page = Math.max(Number.parseInt(String(raw.page ?? 1), 10) || 1, 1);

  return { page, limit, skip: (page - 1) * limit };
}

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  const pages = Math.max(Math.ceil(total / limit), 1);

  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

/**
 * Reads `sort`/`order` into a Mongo sort object, restricted to a whitelist.
 *
 * The whitelist matters: an unvalidated sort key would let a client sort on an
 * unindexed or sensitive field and turn a cheap list query into a collection
 * scan.
 */
export function parseSort(
  query: unknown,
  allowed: readonly string[],
  fallback = '-createdAt'
): Record<string, 1 | -1> {
  const raw = (query ?? {}) as Record<string, unknown>;

  const requested = typeof raw.sort === 'string' ? raw.sort : fallback;
  const descending = requested.startsWith('-') || raw.order === 'desc';
  const field = requested.replace(/^-/, '');

  if (!allowed.includes(field)) {
    const defaultField = fallback.replace(/^-/, '');
    return { [defaultField]: fallback.startsWith('-') ? -1 : 1 };
  }

  return { [field]: descending ? -1 : 1 };
}

/** Escapes a user-supplied string for safe use inside a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
