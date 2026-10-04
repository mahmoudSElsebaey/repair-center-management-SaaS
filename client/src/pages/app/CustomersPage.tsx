import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, Pencil, Plus, Smartphone, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableToolbar, type Column } from '@/components/tables/DataTable';
import { PageTransition } from '@/components/motion/primitives';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/feedback/Toast';
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog';
import { customersApi } from '@/features/customers/api';
import type { Customer } from '@/features/customers/types';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale } from '@/lib/i18nText';
import { formatDate } from '@/lib/utils';

/**
 * Customer list.
 *
 * Search, paging and sorting are server-side: a repair chain accumulates
 * customers indefinitely, so the table must never assume it holds them all.
 */
export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useToast();
  const locale = activeLocale();

  useDocumentTitle(t('customers.title'));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [archiving, setArchiving] = useState<Customer | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const fetcher = useCallback(
    ({ page, limit, search }: { page: number; limit: number; search: string }) =>
      customersApi.list({
        page,
        limit,
        search: search || undefined,
        isActive: showArchived ? undefined : 'true',
        sort: 'createdAt',
      }),
    [showArchived]
  );

  const { items, meta, setPage, search, setSearch, isLoading, error, reload } =
    usePaginatedList<Customer>(fetcher);

  const columns = useMemo<Column<Customer>[]>(
    () => [
      {
        key: 'name',
        header: t('customers.name'),
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.name}</p>
            <p className="numeric mt-0.5 truncate text-2xs text-foreground-subtle" dir="ltr">
              {row.customerCode}
            </p>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('customers.phone'),
        render: (row) => (
          <span className="numeric text-foreground-muted" dir="ltr">
            {row.phone}
          </span>
        ),
      },
      {
        key: 'city',
        header: t('customers.city'),
        render: (row) => <span className="text-foreground-muted">{row.city || '—'}</span>,
      },
      {
        key: 'devices',
        header: t('customers.devices'),
        className: 'w-28',
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 text-foreground-muted">
            <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="numeric">{row.deviceCount ?? 0}</span>
          </span>
        ),
      },
      {
        key: 'created',
        header: t('customers.customerSince'),
        render: (row) => (
          <span className="text-foreground-subtle">{formatDate(row.createdAt, locale)}</span>
        ),
      },
      {
        key: 'status',
        header: t('customers.status'),
        className: 'w-24',
        render: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'} withDot size="sm">
            {row.isActive ? t('customers.active') : t('customers.archived')}
          </Badge>
        ),
      },
    ],
    [t, locale]
  );

  const confirmArchive = async () => {
    if (!archiving) return;
    setIsArchiving(true);

    try {
      const result = await customersApi.archive(archiving.id);
      notify.success(
        t('customers.archivedToast'),
        t('customers.archivedBody', { count: result.devicesDeactivated })
      );
      setArchiving(null);
      void reload();
    } catch {
      notify.error(t('states.errorTitle'));
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('customers.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('customers.subtitle')}</p>
          </div>

          <Button
            leadingIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t('customers.add')}
          </Button>
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('customers.searchPlaceholder')}
          filters={
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground-muted">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => {
                  setShowArchived(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-2 focus:ring-primary/50"
              />
              {t('customers.showArchived')}
            </label>
          }
        />

        <DataTable<Customer>
          columns={columns}
          rows={items}
          meta={meta}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/app/customers/${row.id}`)}
          emptyTitle={t('customers.empty')}
          emptyDescription={t('customers.emptyBody')}
          emptyAction={
            <Button
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('customers.add')}
            </Button>
          }
          rowActions={(row) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                title={t('common.edit')}
                aria-label={`${t('common.edit')} ${row.name}`}
                onClick={() => {
                  setEditing(row);
                  setFormOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {row.isActive && (
                <button
                  type="button"
                  title={t('customers.archived')}
                  aria-label={`${t('customers.archived')} ${row.name}`}
                  onClick={() => setArchiving(row)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-danger-soft hover:text-danger"
                >
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        />
      </div>

      <CustomerFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editing}
      />

      <Modal
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        size="sm"
        title={t('customers.archiveConfirmTitle')}
        description={t('customers.archiveConfirmBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiving(null)} disabled={isArchiving}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmArchive} isLoading={isArchiving}>
              {t('customers.archived')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground-muted">{archiving?.name}</p>
      </Modal>
    </PageTransition>
  );
}
