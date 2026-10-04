import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';

export interface Column<T> {
  key: string;
  /** Already-translated header text. */
  header: string;
  /** Cell renderer. Keep the cell narrow; wide content belongs on the detail page. */
  render: (row: T) => React.ReactNode;
  /** Applied to both the header and body cells — use for width and alignment. */
  className?: string;
  headerClassName?: string;
}

/**
 * The table used by every list screen.
 *
 * It owns only presentation: the caller owns fetching, filtering and paging, so
 * the same component serves customers, devices and later repair tickets without
 * growing options. On narrow viewports the table scrolls horizontally inside its
 * own container rather than crushing columns, and the surrounding page never
 * scrolls sideways.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  meta,
  isLoading,
  error,
  onRetry,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onPageChange,
  selecting,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  rowActions,
}: {
  columns: Column<T>[];
  rows: T[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onPageChange?: (page: number) => void;
  /** Enables the leading checkbox column. */
  selecting?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  rowActions?: (row: T) => React.ReactNode;
}) {
  const { t } = useTranslation();

  if (error) {
    return (
      <ErrorState
        title={t('states.errorTitle')}
        description={error}
        onRetry={onRetry}
        retryLabel={t('common.retry')}
      />
    );
  }

  if (isLoading && rows.length === 0) {
    return <TableSkeleton columns={columns.length + (selecting ? 1 : 0) + (rowActions ? 1 : 0)} />;
  }

  if (!isLoading && rows.length === 0) {
    return (
      <EmptyState
        size="lg"
        icon={<Inbox className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const allSelected = Boolean(
    selecting && rows.length > 0 && selectedIds && selectedIds.length === rows.length
  );

  return (
    <div className="rf-panel overflow-hidden">
      {/* Horizontal scroll lives here, so the page itself never scrolls sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              {selecting && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    aria-label={t('common.all')}
                    className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-2 focus:ring-primary/50"
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-start text-2xs font-semibold uppercase tracking-wide text-foreground-subtle',
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}

              {rowActions && <th scope="col" className="w-16 px-4 py-3" />}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isSelected = Boolean(selectedIds?.includes(row.id));

              return (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-border-soft transition-colors duration-fast last:border-b-0',
                    isSelected ? 'bg-primary-soft' : 'hover:bg-surface-hover',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {selecting && (
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(row.id)}
                        aria-label={row.id}
                        className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-2 focus:ring-primary/50"
                      />
                    </td>
                  )}

                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-4 py-3 align-middle', column.className)}>
                      {column.render(row)}
                    </td>
                  ))}

                  {rowActions && (
                    <td
                      className="px-4 py-3 text-end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/60 px-4 py-3">
          <p className="numeric text-xs text-foreground-subtle">
            {t('common.showing', {
              from: (meta.page - 1) * meta.limit + 1,
              to: Math.min(meta.page * meta.limit, meta.total),
              total: meta.total,
            })}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!meta.hasPrev || isLoading}
              onClick={() => onPageChange?.(meta.page - 1)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-muted transition-colors duration-fast hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5 rf-flip-rtl" aria-hidden="true" />
              {t('common.previous')}
            </button>

            <span className="numeric px-1 text-xs text-foreground-subtle">
              {meta.page} / {meta.pages}
            </span>

            <button
              type="button"
              disabled={!meta.hasNext || isLoading}
              onClick={() => onPageChange?.(meta.page + 1)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-muted transition-colors duration-fast hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('common.next')}
              <ChevronRight className="h-3.5 w-3.5 rf-flip-rtl" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Search + filter bar shown above a table.
 *
 * Debouncing lives with the caller's fetch, not here — this is a controlled
 * input so the value can also be read from the URL.
 */
export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  actions,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[14rem] flex-1">
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-10 w-full rounded-lg border border-border bg-surface-sunken px-3.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45"
        />
      </div>

      {filters}

      {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
