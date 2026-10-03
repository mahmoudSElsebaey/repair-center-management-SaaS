import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, directionFor, isRtl, toggleLanguage } from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLocale } from '@/store/uiSlice';
import { setUserLocale } from '@/features/auth/authSlice';
import type { Locale } from '@/types/domain';

/**
 * Language controller.
 *
 * Keeps three things in agreement: i18next (copy), the Redux preference
 * (persisted) and the user's stored profile preference on the server.
 */
export function useLanguage() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const { i18n } = useTranslation();

  const applyLocale = useCallback(
    (next: Locale) => {
      dispatch(setLocale(next));
      dispatch(setUserLocale(next));
      void changeLanguage(next);
      // `<html lang>` drives the CSS font stack, so re-render fonts instantly.
      document.documentElement.setAttribute('data-locale', next);
    },
    [dispatch]
  );

  const toggle = useCallback(() => {
    applyLocale(toggleLanguage(locale));
  }, [applyLocale, locale]);

  return {
    locale,
    /** i18next's live language — may differ for a frame during a switch. */
    activeLocale: i18n.language as Locale,
    isRtl: isRtl(locale),
    direction: directionFor(locale),
    setLocale: applyLocale,
    toggle,
  };
}
