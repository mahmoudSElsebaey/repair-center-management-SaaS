import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hides the close button when the modal requires an explicit decision. */
  dismissible?: boolean;
  closeLabel?: string;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

/**
 * Accessible dialog rendered in a portal.
 *
 * Handles what a real product needs: focus is moved in and restored on close,
 * Escape closes, the page behind cannot scroll, and the panel is announced as a
 * labelled dialog. `prefers-reduced-motion` removes the scale transition.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  closeLabel = 'Close',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Move focus into the dialog, then restore it.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, button, textarea, select, [href], [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? panelRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Escape to close, Tab cycles inside the dialog.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, dismissible]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.18 }}
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: prefersReduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative flex w-full flex-col overflow-hidden bg-elevated shadow-xl',
              'rounded-t-2xl sm:rounded-2xl border border-border',
              'max-h-[92dvh] sm:max-h-[88dvh]',
              SIZES[size]
            )}
          >
            {(title || dismissible) && (
              <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-foreground-muted">{description}</p>
                  )}
                </div>

                {dismissible && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={closeLabel}
                    className="-me-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </header>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-surface/60 px-5 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
