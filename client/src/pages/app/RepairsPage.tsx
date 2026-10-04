import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Hourglass, PackageCheck, Plus, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/forms/Fields';
import { DataTable, TableToolbar, type Column } from '@/components/tables/DataTable';
import { PageTransition } from '@/components/motion/primitives';
import { CreateRepairDialog } from '@/features/repairs/components/CreateRepairDialog';
import { PriorityBadge, StatusBadge, TicketCode } from '@/features/repairs/components/TicketBadges';
import { repairsApi } from '@/features/repairs/api';
import type { RepairQuery, RepairTicket } from '@/features/repairs/types';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale } from '@/lib/i18nText';
import { formatDate } from '@/lib/utils';
import { REPAIR_STATUSES, type RepairStatus } from '@/types/domain';
import { useAppSelector } from '@/store/hooks';

/** Filter presets, because a nine-way status dropdown is not how people think. */
const PRESETS = [
  { key: 'all', query: {} },
  { key: 'active', query: { state: 'active' as const } },
  { key: 'waiting', query: { status: 'waiting_customer' as const } },
  { key: 'ready', query: { status: 'ready' as const } },
  { key: 'closed', query: { state: 'closed' as const } },
] as const;

type PresetKey = (typeof PRESETS)[number]['key'];

/**
 * Repair ticket worklist.
 *
 * Search spans the ticket code, the customer and the device because that is how
 * a counter finds a ticket — rarely by its exact code.
 */
export default function RepairsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = activeLocale();
  const user = useAppSelector((state) => state.auth.user);

  useDocumentTitle(t('repairs.title'));

  const [preset, setPreset] = useState<PresetKey>('all');
  const [statusFilter, setStatusFilter] = useState<RepairStatus | ''>('');
  const [mineOnly, setMineOnly] = useState(user?.role === 'technician');
  const [createOpen, setCreateOpen] = useState(false);

  const fetcher = useCallback(
    ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      const presetQuery = PRESETS.find((entry) => entry.key === preset)?.query ?? {};

      const query: RepairQuery = {
        page,
        limit,
        search: search || undefined,
        // An explicit status filter overrides the preset.
        ...(statusFilter ? { status: statusFilter } : presetQuery),
        ...(mineOnly ? { mine: 'true' as const } : {}),
        sort: '-createdAt',
      };

      return repairsApi.list(query);
    },
    [preset, statusFilter, mineOnly]
  );

  const { items, meta, setPage, search, setSearch, isLoading, error, reload } =
    usePaginatedList<RepairTicket>(fetcher);

  const columns = useMemo<Column<RepairTicket>[]>(
    () => [
      {
        key: 'code',
        header: t('repairs.code'),
        className: 'w-36',
        render: (row) => (
          <div className="min-w-0">
            <TicketCode code={row.code} />
            <p className="mt-1">
              <PriorityBadge priority={row.priority} size="sm" />
            </p>
          </div>
        ),
      },
      {
        key: 'device',
        header: t('repairs.device'),
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {row.deviceSummary?.displayName ?? '—'}
            </p>
            <p className="mt-0.5 truncate text-2xs text-foreground-subtle">
              {row.issue.slice(0, 60)}
              {row.issue.length > 60 && '…'}
            </p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: t('repairs.customer'),
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-foreground-muted">{row.customerSummary?.name ?? '—'}</p>
            <p className="numeric mt-0.5 truncate text-2xs text-foreground-subtle" dir="ltr">
              {row.customerSummary?.phone ?? ''}
            </p>
          </div>
        ),
      },
      {
        key: 'technician',
        header: t('repairs.technician'),
        render: (row) => (
          <span className={row.technicianSummary ? 'text-foreground-muted' : 'text-foreground-subtle'}>
            {row.technicianSummary?.name ?? t('repairs.unassigned')}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('repairs.detailTitle'),
        className: 'w-40',
        render: (row) => <StatusBadge status={row.status} size="sm" />,
      },
      {
        key: 'received',
        header: t('repairs.received'),
        className: 'w-28',
        render: (row) => (
          <span className="text-foreground-subtle">{formatDate(row.createdAt, locale)}</span>
        ),
      },
    ],
    [t, locale]
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-5">
        {/* ---------------------------------------------------------- header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('repairs.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('repairs.subtitle')}</p>
          </div>

          <Button
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            {t('repairs.add')}
          </Button>
        </div>

        {/* --------------------------------------------------------- presets */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => {
                setPreset(entry.key);
                setStatusFilter('');
                setPage(1);
              }}
              className={
                preset === entry.key && !statusFilter
                  ? 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-3 text-xs font-medium text-primary'
                  : 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-muted transition-colors duration-fast hover:bg-surface-hover'
              }
            >
              {entry.key === 'active' && <Wrench className="h-3 w-3" aria-hidden="true" />}
              {entry.key === 'waiting' && <Hourglass className="h-3 w-3" aria-hidden="true" />}
              {entry.key === 'ready' && <PackageCheck className="h-3 w-3" aria-hidden="true" />}
              {entry.key === 'closed' && <Clock className="h-3 w-3" aria-hidden="true" />}
              {t(`repairs.summary.${entry.key}`, { defaultValue: t('repairs.filters.all') })}
            </button>
          ))}

          {user?.role === 'technician' && (
            <label className="ms-auto inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-foreground-muted">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(event) => {
                  setMineOnly(event.target.checked);
                  setPage(1);
                }}
                className="h-3.5 w-3.5 rounded border-border bg-surface text-primary focus:ring-2 focus:ring-primary/50"
              />
              {t('repairs.filters.mine')}
            </label>
          )}
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('repairs.searchPlaceholder')}
          filters={
            <Select
              selectSize="md"
              className="w-48"
              aria-label={t('repairs.detailTitle')}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as RepairStatus | '');
                setPage(1);
              }}
              options={[
                { value: '', label: `${t('common.all')}` },
                ...REPAIR_STATUSES.map((status) => ({
                  value: status,
                  label: t(`repairs.status.${status}`),
                })),
              ]}
            />
          }
        />

        <DataTable<RepairTicket>
          columns={columns}
          rows={items}
          meta={meta}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/app/repairs/${row.id}`)}
          emptyTitle={t('repairs.empty')}
          emptyDescription={t('repairs.emptyBody')}
          emptyAction={
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              {t('repairs.add')}
            </Button>
          }
        />
      </div>

      <CreateRepairDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(ticket) => navigate(`/app/repairs/${ticket.id}`)}
      />
    </PageTransition>
  );
}
