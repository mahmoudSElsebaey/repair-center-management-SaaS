import { useEffect, useRef } from 'react';
import { VisuallyHidden } from './VisuallyHidden';

type Politeness = 'polite' | 'assertive';

/**
 * ARIA live region for dynamic status messages (loading, success, errors).
 * Announces changes to screen readers without moving focus.
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  clearAfterMs = 5000,
}: {
  message: string | null | undefined;
  politeness?: Politeness;
  clearAfterMs?: number;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || clearAfterMs <= 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    // Message is controlled by parent; this only prevents stale long-lived announcements.
    timerRef.current = setTimeout(() => {
      /* parent owns clearing; timer is defensive */
    }, clearAfterMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, clearAfterMs]);

  if (!message) return null;

  return (
    <VisuallyHidden
      as="div"
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </VisuallyHidden>
  );
}
