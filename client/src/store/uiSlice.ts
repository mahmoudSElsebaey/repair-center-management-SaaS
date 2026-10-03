import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { readLocale, readTheme, writeLocale, writeTheme } from '@/lib/storage';
import type { Locale, Theme } from '@/types/domain';

/**
 * Presentation state that must be shared across distant parts of the tree:
 * theme, language, navigation chrome and transient toasts.
 */

export interface Toast {
  id: string;
  tone: 'success' | 'error' | 'info' | 'warning';
  /** i18n key or literal text already resolved by the caller. */
  message: string;
  description?: string;
}

interface UiState {
  theme: Theme;
  locale: Locale;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toasts: Toast[];
}

const initialState: UiState = {
  theme: readTheme() ?? 'dark',
  locale: readLocale() ?? 'ar',
  sidebarCollapsed: false,
  mobileNavOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      writeTheme(action.payload);
    },

    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      writeTheme(state.theme);
    },

    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
      writeLocale(action.payload);
    },

    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    setMobileNav(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },

    pushToast(state, action: PayloadAction<Omit<Toast, 'id'> & { id?: string }>) {
      const id = action.payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      state.toasts.push({ ...action.payload, id });
    },

    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },

    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setLocale,
  toggleSidebar,
  setMobileNav,
  pushToast,
  dismissToast,
  clearToasts,
} = uiSlice.actions;

export default uiSlice.reducer;
