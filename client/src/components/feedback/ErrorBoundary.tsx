import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

/**
 * Last line of defence.
 *
 * A render-time crash anywhere in the tree would otherwise leave the user with
 * a blank white page. This catches it, shows something usable, and keeps the
 * technical detail on screen during development only.
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = { error: null, info: null };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Swap this for a real reporting sink during production hardening.
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ info: info.componentStack ?? null });
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  private readonly handleReset = (): void => {
    this.setState({ error: null, info: null });
  };

  public override render(): ReactNode {
    const { error } = this.state;

    if (!error) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="rf-panel w-full max-w-lg p-7 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-danger/30 bg-danger-soft text-danger">
            <AlertOctagon className="h-6 w-6" aria-hidden="true" />
          </div>

          <h1 className="text-lg font-semibold text-foreground">
            Fixer hit an unexpected error
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            The screen could not render. Your data is safe — reload to continue working.
          </p>

          {isDev && (
            <pre className="numeric mt-5 max-h-56 overflow-auto rounded-lg border border-border bg-surface-sunken p-3 text-start text-xs text-danger">
              {error.message}
              {this.state.info ? `\n${this.state.info}` : ''}
            </pre>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors duration-fast hover:bg-primary-hover"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reload the app
            </button>

            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface-hover"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
