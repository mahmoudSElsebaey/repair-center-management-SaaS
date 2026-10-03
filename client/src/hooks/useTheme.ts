import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, toggleTheme } from '@/store/uiSlice';
import type { Theme } from '@/types/domain';

/**
 * Theme controller. The token layer reacts to `data-theme` on the document
 * element, so a single attribute swap re-themes every surface in the app.
 */
export function useTheme() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Lets the browser style native controls (scrollbars, form fields) correctly.
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const set = useCallback((next: Theme) => dispatch(setTheme(next)), [dispatch]);
  const toggle = useCallback(() => dispatch(toggleTheme()), [dispatch]);

  return { theme, isDark: theme === 'dark', setTheme: set, toggleTheme: toggle };
}
