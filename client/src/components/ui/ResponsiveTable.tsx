import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Table that stays scrollable on small screens and can optionally render
 * a card list via `mobileRender` for better touch UX.
 *
 * Usage:
 *   <ResponsiveTable
 *     headers={[...]}
 *     rows={data}
 *     renderRow={(row) => <tr>...</tr>}
 *     mobileRender={(row) => <Card>...</Card>}
 *   />
 */
export function ResponsiveTable<T>({
  headers,
  rows,
  renderRow,
  mobileRender,
  empty,
  className,
  caption,
}: {
  headers: ReactNode[];
  rows: T[];
  renderRow: (row: T, index: number) => ReactNode;
  /** When provided, used below `md` instead of the horizontal-scroll table */
  mobileRender?: (row: T, index: number) => ReactNode;
  empty?: ReactNode;
  className?: string;
  caption?: string;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop / tablet table */}
      <div className={cn('overflow-x-auto', mobileRender && 'hidden md:block')}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-border text-start text-foreground-muted">
              {headers.map((h, i) => (
                <th key={i} scope="col" className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
        </table>
      </div>

      {/* Mobile card list */}
      {mobileRender ? (
        <div className="space-y-3 md:hidden" role="list">
          {rows.map((row, i) => (
            <div key={i} role="listitem">
              {mobileRender(row, i)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
