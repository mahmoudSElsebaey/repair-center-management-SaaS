import { useEffect, useState } from 'react';

/**
 * Tracks the user's motion preference.
 *
 * Any component that animates must consult this: Framer Motion variants are
 * neutralised, the 3D hero is replaced by its static fallback, and counters
 * jump straight to their final value.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
}
