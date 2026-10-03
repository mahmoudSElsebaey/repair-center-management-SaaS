import { useEffect } from 'react';
import { env } from '@/lib/env';

/**
 * Keeps the document title in step with the active screen and language.
 * Restores nothing — every route sets its own title on mount.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${env.appName}` : env.appName;
  }, [title]);
}
