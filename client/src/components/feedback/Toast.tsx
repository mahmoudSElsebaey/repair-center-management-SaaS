import { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissToast, pushToast, type Toast } from '@/store/uiSlice';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<Toast['tone'], { container: string; icon: React.ReactNode }> = {
  success: {
    container: 'border-success/30 bg-success-soft',
    icon: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />,
  },
  error: {
    container: 'border-danger/30 bg-danger-soft',
    icon: <XCircle className="h-5 w-5 text-danger" aria-hidden="true" />,
  },
  warning: {
    container: 'border-warning/30 bg-warning-soft',
    icon: <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />,
  },
  info: {
    container: 'border-info/30 bg-info-soft',
    icon: <Info className="h-5 w-5 text-info" aria-hidden="true" />,
  },
};

/**
 * Global feedback surface.
 *
 * Toasts are announced politely to assistive technology, auto-dismiss after a
 * tone-appropriate delay, and can always be dismissed manually.
 */
export function ToastViewport({ closeLabel = 'Dismiss notification' }: { closeLabel?: string }) {
  const toasts = useAppSelector((state) => state.ui.toasts);
  const dispatch = useAppDispatch();
  const prefersReduced = useReducedMotion();

  const dismiss = useCallback((id: string) => dispatch(dismissToast(id)), [dispatch]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2.5 p-4 sm:inset-x-auto sm:bottom-4 sm:end-4 sm:items-end"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout={!prefersReduced}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: prefersReduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3.5 shadow-lg',
              'backdrop-blur-sm',
              TONE_STYLES[toast.tone].container
            )}
          >
            <span className="mt-0.5 shrink-0">{TONE_STYLES[toast.tone].icon}</span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{toast.message}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-foreground-muted">{toast.description}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={closeLabel}
              className="-me-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Ergonomic hook for raising feedback from anywhere.
 *
 * ```tsx
 * const notify = useToast();
 * notify.success('Saved', 'The ticket was updated.');
 * ```
 */
export function useToast() {
  const dispatch = useAppDispatch();

  const show = useCallback(
    (toast: Omit<Toast, 'id'>) => dispatch(pushToast(toast)),
    [dispatch]
  );

  return {
    show,
    success: (message: string, description?: string) =>
      show({ tone: 'success', message, description }),
    error: (message: string, description?: string) => show({ tone: 'error', message, description }),
    warning: (message: string, description?: string) =>
      show({ tone: 'warning', message, description }),
    info: (message: string, description?: string) => show({ tone: 'info', message, description }),
  };
}
