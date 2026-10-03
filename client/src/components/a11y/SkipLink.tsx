import { cn } from '@/lib/utils';

/**
 * Keyboard escape hatch. Rendered first in the document so the very first Tab
 * press reveals it and lets a keyboard user jump past the navigation.
 */
export function SkipLink({ label, href = '#main-content' }: { label: string; href?: string }) {
  return (
    <a
      href={href}
      className={cn(
        'rf-sr-only focus:not-sr-only',
        'focus:fixed focus:start-4 focus:top-4 focus:z-toast',
        'focus:inline-flex focus:h-10 focus:items-center focus:rounded-lg',
        'focus:bg-primary focus:px-4 focus:text-sm focus:font-medium focus:text-primary-foreground',
        'focus:shadow-lg focus:outline-none'
      )}
    >
      {label}
    </a>
  );
}
