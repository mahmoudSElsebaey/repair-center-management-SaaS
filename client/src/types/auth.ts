import type { Locale, UserRole } from './domain';

export interface BranchRef {
  id: string;
  name: string;
  code: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  locale: Locale;
  /** Branch id, or null for roles that span every branch. */
  branch: string | null;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSessionPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  avatar?: string;
  locale?: Locale;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Persisted session shape — the only thing written to localStorage. */
export interface StoredSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
