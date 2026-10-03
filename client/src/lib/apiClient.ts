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

/** Extra flags understood by our interceptors. */
interface RepairFlowRequestConfig extends InternalAxiosRequestConfig {
  /** Skip attaching the bearer token (login, refresh, public tracking). */
  skipAuth?: boolean;
  /** Internal marker preventing infinite refresh recursion. */
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

/* -------------------------------------------------------------------------- */
/* Request — attach the access token                                           */
/* -------------------------------------------------------------------------- */

http.interceptors.request.use((config: RepairFlowRequestConfig) => {
  if (!config.skipAuth) {
    const session = readSession();
    if (session?.accessToken) {
      config.headers.set('Authorization', `Bearer ${session.accessToken}`);
    }
  }
  return config;
});

/* -------------------------------------------------------------------------- */
/* Response — normalise errors, refresh on 401 once                            */
/* -------------------------------------------------------------------------- */

/** Subscribers waiting for the in-flight refresh to settle. */
type RefreshWaiter = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let refreshInFlight: Promise<string> | null = null;
let waiters: RefreshWaiter[] = [];

/** Set by the auth layer so a hard session failure can navigate to /login. */
let onSessionExpired: (() => void) | null = null;

export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

function notifySessionExpired(): void {
  onSessionExpired?.();
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const axiosError = error as AxiosError<ApiEnvelope<unknown>>;

  if (!axiosError.response) {
    const timedOut = axiosError.code === 'ECONNABORTED';
    return new ApiError(
      timedOut
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the RepairFlow server. Check your connection and try again.',
      0,
      timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR'
    );
  }

  const { status, data } = axiosError.response;
  const payload = (data ?? {}) as ApiEnvelope<unknown>;

  return new ApiError(
    payload.message || axiosError.message || 'Request failed',
    status,
    payload.code || 'REQUEST_FAILED',
    payload.errors
  );
}

/**
 * Exchanges the stored refresh token for a new pair.
 *
 * Concurrent 401s share a single refresh request — without this, a dashboard
 * firing six parallel calls would rotate the refresh token six times and
 * invalidate its own session.
 */
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
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config as RepairFlowRequestConfig | undefined;

    const isAuthEndpoint = Boolean(config?.url?.includes('/auth/'));
    const canRetry = error.response?.status === 401 && config && !config._retried && !isAuthEndpoint;

    if (canRetry && config) {
      config._retried = true;

      try {
        // Join an in-flight refresh rather than starting a competing one.
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

/* -------------------------------------------------------------------------- */
/* Thin typed helpers                                                          */
/* -------------------------------------------------------------------------- */

/** Unwraps the envelope and returns `data`, throwing a normalised ApiError. */
export async function request<T>(config: AxiosRequestConfig & { skipAuth?: boolean }): Promise<T> {
  const response = await http.request<ApiEnvelope<T>>(config as AxiosRequestConfig);
  const payload = response.data;

  if (!payload || payload.success === false) {
    throw new ApiError(
      payload?.message || 'The server returned an unexpected response',
      response.status,
      payload?.code || 'MALFORMED_RESPONSE',
      payload?.errors
    );
  }

  return payload.data as T;
}

/** Same as `request`, but keeps the pagination envelope. */
export async function requestWithMeta<T>(
  config: AxiosRequestConfig & { skipAuth?: boolean }
): Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }> {
  const response = await http.request<ApiEnvelope<T>>(config as AxiosRequestConfig);
  const payload = response.data;

  if (!payload || payload.success === false) {
    throw new ApiError(
      payload?.message || 'The server returned an unexpected response',
      response.status,
      payload?.code || 'MALFORMED_RESPONSE',
      payload?.errors
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
