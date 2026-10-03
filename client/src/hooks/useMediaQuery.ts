import { useEffect, useState } from 'react';

/**
 * Subscribes to a media query.
 *
 * Used for behaviour that genuinely differs by viewport — collapsing the
 * sidebar, skipping the 3D scene on small devices — rather than for styling,
 * which stays in CSS.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

/** Convenience wrappers for the breakpoints the layout actually branches on. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px)');
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
