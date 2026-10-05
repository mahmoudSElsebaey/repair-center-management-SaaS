/**
 * Shared accessibility helpers and constants for Fixer Phase 13.
 */

/** Prefer reduced motion — matches CSS media query. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Trap focus inside a container (modal / drawer). Returns cleanup. */
export function trapFocus(container: HTMLElement): () => void {
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return () => undefined;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', onKeyDown);
  first.focus();
  return () => container.removeEventListener('keydown', onKeyDown);
}
