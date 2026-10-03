import { api } from '@/lib/apiClient';
import type {
  AuthSessionPayload,
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  UpdateProfilePayload,
} from '@/types/auth';

/**
 * Auth endpoints. Each function returns already-unwrapped data — the transport
 * envelope is handled once inside `apiClient`.
 */

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthSessionPayload>('/auth/login', credentials, { skipAuth: true }),

  logout: () => api.post<null>('/auth/logout'),

  me: () => api.get<{ user: AuthUser }>('/auth/me'),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<{ user: AuthUser }>('/auth/me', payload),

  changePassword: (payload: ChangePasswordPayload) => api.patch<null>('/auth/password', payload),

  forgotPassword: (email: string) =>
    api.post<{ devResetToken?: string }>('/auth/forgot-password', { email }, { skipAuth: true }),

  resetPassword: (token: string, password: string) =>
    api.post<null>('/auth/reset-password', { token, password }, { skipAuth: true }),

  health: () =>
    api.get<{ version: string; environment: string; database: string }>('/health', {
      skipAuth: true,
    }),
};
