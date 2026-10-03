import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { clearSession, readSession, writeSession } from '@/lib/storage';
import type { AuthUser, StoredSession } from '@/types/auth';
import type { Locale } from '@/types/domain';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: AuthStatus;
  /** True once the initial session check has settled, so routes can decide. */
  bootstrapped: boolean;
  error: string | null;
}

const persisted = readSession();

const initialState: AuthState = {
  user: persisted?.user ?? null,
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,
  status: persisted ? 'authenticated' : 'idle',
  bootstrapped: false,
  error: null,
};

function persist(state: AuthState): void {
  if (state.user && state.accessToken && state.refreshToken) {
    const session: StoredSession = {
      user: state.user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
    };
    writeSession(session);
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStarted(state) {
      state.status = 'loading';
      state.error = null;
    },

    authFailed(state, action: PayloadAction<string>) {
      state.status = 'anonymous';
      state.error = action.payload;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      clearSession();
    },

    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string; refreshToken: string }>
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.status = 'authenticated';
      state.error = null;
      persist(state);
    },

    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      persist(state);
    },

    /** Locale is a user preference as well as a UI setting. */
    setUserLocale(state, action: PayloadAction<Locale>) {
      if (state.user) {
        state.user = { ...state.user, locale: action.payload };
        persist(state);
      }
    },

    bootstrapFinished(state) {
      state.bootstrapped = true;
      if (!state.accessToken) state.status = 'anonymous';
    },

    /** Session revoked locally (logout, or the refresh token was rejected). */
    sessionCleared(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'anonymous';
      state.bootstrapped = true;
      state.error = null;
      clearSession();
    },
  },
});

export const {
  authStarted,
  authFailed,
  setCredentials,
  setUser,
  setUserLocale,
  bootstrapFinished,
  sessionCleared,
} = authSlice.actions;

export default authSlice.reducer;
