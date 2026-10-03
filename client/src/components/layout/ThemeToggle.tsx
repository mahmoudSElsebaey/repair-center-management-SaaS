import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/**
 * Theme switch. Shows the icon of the theme you would move *to*, which reads
 * more naturally than showing the current state.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  const label = `${t('theme.toggle')} — ${isDark ? t('theme.light') : t('theme.dark')}`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg',
        'border border-border bg-surface text-foreground-muted',
        'transition-colors duration-fast ease-soft hover:bg-surface-hover hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        className
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
