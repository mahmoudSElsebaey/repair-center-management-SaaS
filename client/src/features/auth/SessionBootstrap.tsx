import { useEffect, useRef, type ReactNode } from 'react';
import { authApi } from '@/features/auth/authApi';
import { bootstrapFinished, setCredentials, sessionCleared } from '@/features/auth/authSlice';
import { registerSessionExpiredHandler } from '@/lib/apiClient';
import { clearSession, readSession } from '@/lib/storage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * Restores the session before the app decides what to render.
 *
 * On boot the access token in storage is usually expired (15-minute lifetime),
 * so the first authenticated call transparently refreshes and rotates the pair
 * inside the axios layer. If that fails, the session is dropped and the user
 * lands on the sign-in screen instead of a broken console.
 */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const bootstrapped = useAppSelector((state) => state.auth.bootstrapped);
  const started = useRef(false);

  // Let the transport layer tell the app when a session is definitively gone.
  useEffect(() => {
    registerSessionExpiredHandler(() => {
      clearSession();
      dispatch(sessionCleared());
    });
  }, [dispatch]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const session = readSession();

    if (!session) {
      dispatch(bootstrapFinished());
      return;
    }

    // Optimistically trust storage so the first paint is the console, then
    // reconcile with the server. A rejected token clears the session above.
    dispatch(
      setCredentials({
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      })
    );

    void authApi
      .me()
      .then(({ user }) => {
        dispatch(
          setCredentials({
            user,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
          })
        );
      })
      .catch(() => {
        // Either the refresh failed (session revoked) or the API is unreachable.
        // Only treat an explicit auth failure as a logout.
        clearSession();
        dispatch(sessionCleared());
      })
      .finally(() => {
        dispatch(bootstrapFinished());
      });
  }, [dispatch]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            role="status"
            aria-label="Starting RepairFlow"
          />
          <p className="text-sm text-foreground-muted">RepairFlow</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
