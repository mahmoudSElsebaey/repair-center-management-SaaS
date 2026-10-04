import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import notificationsReducer from '@/features/notifications/notificationsSlice';
import uiReducer from '@/store/uiSlice';

/**
 * One store, two global slices plus notifications.
 *
 * Every server-owned collection gets its own feature slice when its phase
 * arrives (customers, repairs, inventory, invoices). Auth, UI and the
 * notification badge are the genuinely global concerns, so they live at the root.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    notifications: notificationsReducer,
  },
  devTools: import.meta.env.DEV,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // AuthUser and token payloads are plain serialisable data, but Date
      // strings from the API stay strings — no exceptions needed.
      serializableCheck: { warnAfter: 128 },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
