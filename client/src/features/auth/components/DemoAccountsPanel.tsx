import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, KeyRound, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Demo credentials helper.
 *
 * The addresses come from `VITE_DEMO_ACCOUNTS` rather than being hardcoded, so
 * a deployment can ship the panel, point it at its own demo tenant, or omit the
 * variable entirely to hide it. All seeded accounts share one password, which
 * is stated plainly instead of being concealed.
 */
interface DemoAccount {
  role: string;
  email: string;
}

function parseDemoAccounts(raw: string | undefined): DemoAccount[] {
  if (!raw) return [];

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [role, email] = entry.split(':').map((part) => part.trim());
      return { role: role || 'technician', email: email || '' };
    })
    .filter((account) => account.email.length > 0);
}

export function DemoAccountsPanel({
  label,
  hint,
  showLabel,
  hideLabel,
  useLabel,
  onSelect,
}: {
  label: string;
  hint: string;
  showLabel: string;
  hideLabel: string;
  useLabel: string;
  onSelect: (email: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const accounts = parseDemoAccounts(import.meta.env.VITE_DEMO_ACCOUNTS as string | undefined);

  if (accounts.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-start"
      >
        <Wand2 className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-foreground-subtle transition-transform duration-fast',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
        <span className="rf-sr-only">{open ? hideLabel : showLabel}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3.5">
          <p className="mb-3 text-xs text-foreground-subtle">{hint}</p>

          <ul className="space-y-1.5">
            {accounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => onSelect(account.email)}
                  title={useLabel}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-start',
                    'transition-colors duration-fast hover:border-primary/40 hover:bg-primary-soft'
                  )}
                >
                  <KeyRound
                    className="h-3.5 w-3.5 shrink-0 text-foreground-subtle"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {t(`roles.${account.role}`, { defaultValue: account.role })}
                    </span>
                    <span className="numeric block truncate text-2xs text-foreground-subtle" dir="ltr">
                      {account.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
