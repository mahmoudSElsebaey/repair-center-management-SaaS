import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/lib/env';
import { clearSession, readSession, writeSession } from '@/lib/storage';
import type { ApiEnvelope } from '@/types/api';
import type { RefreshedTokens } from '@/types/auth';

/** Normalised transport error. UI code only ever handles this type. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors?: { path: string; message: string }[];

  constructor(
    message: string,
    status: number,
    code = 'REQUEST_FAILED',
    fieldErrors?: { path: string; message: string }[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

interface FixerRequestConfig extends InternalAxiosRequestConfig {
  skipAuth?: boolean;
  _retried?: boolean;
}

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.requestTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

http.interceptors.request.use((config: FixerRequestConfig) => {
  if (!config.skipAuth) {
    const session = readSession();
    if (session?.accessToken) {
      config.headers.set('Authorization', `Bearer ${session.accessToken}`);
    }
  }
  return config;
});

type RefreshWaiter = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let refreshInFlight: Promise<string> | null = null;
let waiters: RefreshWaiter[] = [];

let onSessionExpired: (() => void) | null = null;

export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

function notifySessionExpired(): void {
  onSessionExpired?.();
}

/** Support both `{ message, code }` and `{ error: { message, code } }` envelopes. */
function extractErrorPayload(data: unknown): {
  message?: string;
  code?: string;
  errors?: { path: string; message: string }[];
} {
  if (!data || typeof data !== 'object') return {};
  const root = data as Record<string, unknown>;
  const nested =
    root.error && typeof root.error === 'object'
      ? (root.error as Record<string, unknown>)
      : null;

  const message =
    (typeof nested?.message === 'string' && nested.message) ||
    (typeof root.message === 'string' && root.message) ||
    undefined;
  const code =
    (typeof nested?.code === 'string' && nested.code) ||
    (typeof root.code === 'string' && root.code) ||
    undefined;
  const errors = (nested?.details ?? nested?.errors ?? root.errors) as
    | { path: string; message: string }[]
    | undefined;

  return { message, code, errors };
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const axiosError = error as AxiosError<unknown>;

  if (!axiosError.response) {
    const timedOut = axiosError.code === 'ECONNABORTED';
    return new ApiError(
      timedOut
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the Fixer server. Check your connection and try again.',
      0,
      timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR'
    );
  }

  const { status, data } = axiosError.response;
  const extracted = extractErrorPayload(data);

  return new ApiError(
    extracted.message || axiosError.message || 'Request failed',
    status,
    extracted.code || 'REQUEST_FAILED',
    extracted.errors
  );
}

function refreshSession(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = readSession();
    if (!session?.refreshToken) throw new ApiError('No active session', 401, 'NO_SESSION');

    try {
      const response = await axios.post<ApiEnvelope<RefreshedTokens>>(
        `${env.apiBaseUrl}/auth/refresh`,
        { refreshToken: session.refreshToken },
        { timeout: env.requestTimeoutMs, headers: { 'Content-Type': 'application/json' } }
      );

      const tokens = response.data.data;
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new ApiError('Malformed refresh response', 401, 'REFRESH_MALFORMED');
      }

      writeSession({ ...session, ...tokens });
      waiters.forEach((waiter) => waiter.resolve(tokens.accessToken));
      waiters = [];
      return tokens.accessToken;
    } catch (error) {
      waiters.forEach((waiter) => waiter.reject(error));
      waiters = [];
      clearSession();
      notifySessionExpired();
      throw toApiError(error);
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    const config = error.config as FixerRequestConfig | undefined;

    const isAuthEndpoint = Boolean(config?.url?.includes('/auth/'));
    const canRetry = error.response?.status === 401 && config && !config._retried && !isAuthEndpoint;

    if (canRetry && config) {
      config._retried = true;

      try {
        const token =
          refreshInFlight !== null
            ? await new Promise<string>((resolve, reject) => {
                waiters.push({ resolve, reject });
              })
            : await refreshSession();

        config.headers.set('Authorization', `Bearer ${token}`);
        return http.request(config);
      } catch (refreshError) {
        return Promise.reject(toApiError(refreshError));
      }
    }

    if (error.response?.status === 401 && !isAuthEndpoint) {
      clearSession();
      notifySessionExpired();
    }

    return Promise.reject(toApiError(error));
  }
);

export async function request<T>(config: AxiosRequestConfig & { skipAuth?: boolean }): Promise<T> {
  const response = await http.request<ApiEnvelope<T>>(config as AxiosRequestConfig);
  const payload = response.data;

  if (!payload || payload.success === false) {
    const extracted = extractErrorPayload(payload);
    throw new ApiError(
      extracted.message || payload?.message || 'The server returned an unexpected response',
      response.status,
      extracted.code || payload?.code || 'MALFORMED_RESPONSE',
      extracted.errors || payload?.errors
    );
  }

  return payload.data as T;
}

export async function requestWithMeta<T>(
  config: AxiosRequestConfig & { skipAuth?: boolean }
): Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }> {
  const response = await http.request<ApiEnvelope<T>>(config as AxiosRequestConfig);
  const payload = response.data;

  if (!payload || payload.success === false) {
    const extracted = extractErrorPayload(payload);
    throw new ApiError(
      extracted.message || payload?.message || 'The server returned an unexpected response',
      response.status,
      extracted.code || payload?.code || 'MALFORMED_RESPONSE',
      extracted.errors || payload?.errors
    );
  }

  return { data: payload.data as T, meta: payload.meta };
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig & { skipAuth?: boolean }) =>
    request<T>({ ...config, method: 'GET', url }),

  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig & { skipAuth?: boolean }) =>
    request<T>({ ...config, method: 'POST', url, data: body }),

  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig & { skipAuth?: boolean }) =>
    request<T>({ ...config, method: 'PATCH', url, data: body }),

  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig & { skipAuth?: boolean }) =>
    request<T>({ ...config, method: 'PUT', url, data: body }),

  delete: <T>(url: string, config?: AxiosRequestConfig & { skipAuth?: boolean }) =>
    request<T>({ ...config, method: 'DELETE', url }),
} as const;

export { refreshSession };
