import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/features/auth/authApi';
import { sessionCleared } from '@/features/auth/authSlice';
import { clearSession } from '@/lib/storage';
import { useAppDispatch } from '@/store/hooks';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/feedback/Toast';
import { cn } from '@/lib/utils';

/**
 * Ends the session on both sides.
 *
 * The local session is cleared even if the server call fails — the user asked
 * to sign out, and leaving them half-signed-in is worse than an orphaned
 * refresh token that expires on its own.
 */
export function LogoutButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const notify = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsPending(true);
    try {
      await authApi.logout();
    } catch {
      // Ignored on purpose: local sign-out must always succeed.
    } finally {
      clearSession();
      dispatch(sessionCleared());
      setIsPending(false);
      setConfirmOpen(false);
      navigate('/login', { replace: true });
      notify.info(t('auth.logout'));
    }
  }, [dispatch, navigate, notify, t]);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={cn(
          'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
          'text-foreground-muted transition-colors duration-fast',
          'hover:bg-danger-soft hover:text-danger',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          className
        )}
      >
        <LogOut className="h-4 w-4 shrink-0 rf-flip-rtl" aria-hidden="true" />
        {t('auth.logout')}
      </button>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('auth.logout')}
        description={t('auth.logoutConfirm')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleLogout} isLoading={isPending}>
              {t('auth.logout')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground-muted">
          {t('auth.logoutConfirm')}
        </p>
      </Modal>
    </>
  );
}
