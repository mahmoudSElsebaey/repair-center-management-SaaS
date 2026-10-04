import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppNotification } from './types';

/**
 * Notification state.
 *
 * Only what several distant components need is kept here: the unread count for
 * the topbar badge and the items for the bell dropdown. The full notifications
 * page fetches its own paginated data.
 */

interface NotificationsState {
  unread: number;
  items: AppNotification[];
  isLoading: boolean;
  /** Set once the first fetch settles, so the badge does not flash a zero. */
  loaded: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  unread: 0,
  items: [],
  isLoading: false,
  loaded: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    fetchStarted(state) {
      state.isLoading = true;
      state.error = null;
    },

    fetchSucceeded(
      state,
      action: PayloadAction<{ items: AppNotification[]; unread: number }>
    ) {
      state.items = action.payload.items;
      state.unread = action.payload.unread;
      state.isLoading = false;
      state.loaded = true;
      state.error = null;
    },

    fetchFailed(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.loaded = true;
      state.error = action.payload;
    },

    setUnread(state, action: PayloadAction<number>) {
      state.unread = Math.max(action.payload, 0);
    },

    markRead(state, action: PayloadAction<string>) {
      const item = state.items.find((entry) => entry.id === action.payload);
      if (item && !item.read) {
        item.read = true;
        state.unread = Math.max(state.unread - 1, 0);
      }
    },

    markAllRead(state) {
      state.items.forEach((item) => {
        item.read = true;
      });
      state.unread = 0;
    },

    removeOne(state, action: PayloadAction<string>) {
      const item = state.items.find((entry) => entry.id === action.payload);
      state.items = state.items.filter((entry) => entry.id !== action.payload);
      if (item && !item.read) state.unread = Math.max(state.unread - 1, 0);
    },
  },
});

export const {
  fetchStarted,
  fetchSucceeded,
  fetchFailed,
  setUnread,
  markRead,
  markAllRead,
  removeOne,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
