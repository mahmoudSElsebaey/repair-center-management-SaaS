import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that updates only after `delayMs` of inactivity.
 * Ideal for search inputs so list APIs are not hammered on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
