/**
 * Shared accessibility helpers and constants for RepairFlow Phase 13.
 */

/** Minimum touch target size (px) recommended by WCAG 2.5.5 / mobile HIG */
export const MIN_TOUCH_TARGET = 44;

/**
 * Builds a stable, unique id for labelled form controls.
 * Prefer React's useId() when available; this is a fallback for static ids.
 */
export function fieldId(prefix: string, name: string): string {
  return `${prefix}-${name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * Returns keyboard-friendly props for custom interactive elements that are not
 * native buttons/links (role="button", Enter/Space activation).
 */
export function buttonRoleProps(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    },
  };
}

/**
 * Focus-visible ring utility classes — use on interactive surfaces that need
 * a visible keyboard focus indicator without mouse focus rings.
 */
export const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
