import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * Skip-to-main-content link for keyboard and screen-reader users.
 * Visually hidden until focused. Place as the first focusable element in the document.
 */
export function SkipLink({ targetId = 'main-content' }: { targetId?: string }) {
  const { t } = useTranslation();

  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only',
        'fixed start-4 top-4 z-[100] rounded-md bg-primary px-4 py-2.5',
        'text-sm font-semibold text-primary-foreground shadow-lg',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      {t('a11y.skipToContent')}
    </a>
  );
}
