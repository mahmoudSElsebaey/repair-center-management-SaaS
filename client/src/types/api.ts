/**
 * Every API response uses the same envelope, so feature code never has to guess
 * at the shape of a success or failure.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
  errors?: ApiFieldError[];
  meta?: PaginationMeta;
}

export interface ApiFieldError {
  path: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/** Query parameters accepted by every list endpoint. */
export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
