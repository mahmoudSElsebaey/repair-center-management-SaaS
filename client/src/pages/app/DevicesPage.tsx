import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, Laptop, Pencil, Plus, Tablet, Tv, WashingMachine } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/forms/Fields';
import { DataTable, TableToolbar, type Column } from '@/components/tables/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageTransition } from '@/components/motion/primitives';
import { useToast } from '@/components/feedback/Toast';
import { DeviceFormDialog } from '@/features/customers/components/DeviceFormDialog';
import { devicesApi } from '@/features/customers/api';
import {
  DEVICE_CONDITIONS,
  type Device,
  type DeviceCondition,
} from '@/features/customers/types';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale } from '@/lib/i18nText';
import { formatDate } from '@/lib/utils';
import { DEVICE_TYPES, type DeviceType } from '@/types/domain';

/** Category-appropriate glyph, so a row is identifiable before it is read. */
function DeviceIcon({ type, className }: { type: DeviceType; className?: string }) {
  if (type === 'laptop' || type === 'desktop') return <Laptop className={className} aria-hidden="true" />;
  if (type === 'tv') return <Tv className={className} aria-hidden="true" />;
  if (type === 'appliance' || type === 'ac') {
    return <WashingMachine className={className} aria-hidden="true" />;
  }
  // Smartphones, tablets and anything unclassified share the handheld glyph.
  return <Tablet className={className} aria-hidden="true" />;
}

const CONDITION_TONES: Record<DeviceCondition, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  excellent: 'success',
  good: 'info',
  fair: 'warning',
  poor: 'danger',
  damaged: 'danger',
};

/**
 * Device list.
 *
 * Filtering by type and condition runs server-side, so this screen stays fast as
 * the workshop accumulates units.
 */
export default function DevicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useToast();
  const locale = activeLocale();

  useDocumentTitle(t('devices.title'));

  const [typeFilter, setTypeFilter] = useState<DeviceType | ''>('');
  const [conditionFilter, setConditionFilter] = useState<DeviceCondition | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [archiving, setArchiving] = useState<Device | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const fetcher = useCallback(
    ({ page, limit, search }: { page: number; limit: number; search: string }) =>
      devicesApi.list({
        page,
        limit,
        search: search || undefined,
        deviceType: typeFilter || undefined,
        condition: conditionFilter || undefined,
        sort: 'createdAt',
      }),
    [typeFilter, conditionFilter]
  );

  const { items, meta, setPage, search, setSearch, isLoading, error, reload } =
    usePaginatedList<Device>(fetcher);

  const columns = useMemo<Column<Device>[]>(
    () => [
      {
        key: 'device',
        header: t('devices.device'),
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-foreground-subtle"
              aria-hidden="true"
            >
              <DeviceIcon type={row.deviceType} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{row.displayName}</p>
              <p className="mt-0.5 truncate text-2xs text-foreground-subtle">
                {t(`devices.types.${row.deviceType}`)}
                {row.color && ` · ${row.color}`}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'owner',
        header: t('devices.owner'),
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-foreground-muted">{row.customerName ?? '—'}</p>
            {row.customerCode && (
              <p className="numeric mt-0.5 truncate text-2xs text-foreground-subtle" dir="ltr">
                {row.customerCode}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'serial',
        header: t('devices.serial'),
        render: (row) => (
          <span className="numeric text-xs text-foreground-subtle" dir="ltr">
            {row.serialNumber || row.imei || '—'}
          </span>
        ),
      },
      {
        key: 'condition',
        header: t('devices.condition'),
        className: 'w-32',
        render: (row) => (
          <Badge tone={CONDITION_TONES[row.condition]} size="sm" withDot>
            {t(`devices.conditions.${row.condition}`)}
          </Badge>
        ),
      },
      {
        key: 'registered',
        header: t('devices.registeredOn'),
        render: (row) => (
          <span className="text-foreground-subtle">{formatDate(row.createdAt, locale)}</span>
        ),
      },
    ],
    [t, locale]
  );

  const confirmArchive = async () => {
    if (!archiving) return;
    setIsArchiving(true);

    try {
      await devicesApi.archive(archiving.id);
      notify.success(t('devices.archivedToast'), archiving.displayName);
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
            <h1 className="text-2xl font-bold sm:text-3xl">{t('devices.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('devices.subtitle')}</p>
          </div>

          <Button
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t('devices.add')}
          </Button>
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('devices.searchPlaceholder')}
          filters={
            <>
              <Select
                selectSize="md"
                className="w-40"
                aria-label={t('devices.type')}
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value as DeviceType | '');
                  setPage(1);
                }}
                options={[
                  { value: '', label: `${t('devices.type')}: ${t('common.all')}` },
                  ...DEVICE_TYPES.map((type) => ({ value: type, label: t(`devices.types.${type}`) })),
                ]}
              />

              <Select
                selectSize="md"
                className="w-44"
                aria-label={t('devices.condition')}
                value={conditionFilter}
                onChange={(event) => {
                  setConditionFilter(event.target.value as DeviceCondition | '');
                  setPage(1);
                }}
                options={[
                  { value: '', label: `${t('devices.condition')}: ${t('common.all')}` },
                  ...DEVICE_CONDITIONS.map((condition) => ({
                    value: condition,
                    label: t(`devices.conditions.${condition}`),
                  })),
                ]}
              />
            </>
          }
        />

        <DataTable<Device>
          columns={columns}
          rows={items}
          meta={meta}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/app/devices/${row.id}`)}
          emptyTitle={t('devices.empty')}
          emptyDescription={t('devices.emptyBody')}
          emptyAction={
            <Button
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('devices.add')}
            </Button>
          }
          rowActions={(row) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                title={t('common.edit')}
                aria-label={`${t('common.edit')} ${row.displayName}`}
                onClick={() => {
                  setEditing(row);
                  setFormOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                title={t('devices.archivedToast')}
                aria-label={`${t('devices.archivedToast')} ${row.displayName}`}
                onClick={() => setArchiving(row)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-danger-soft hover:text-danger"
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        />
      </div>

      <DeviceFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        device={editing}
        onSaved={() => void reload()}
      />

      <Modal
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        size="sm"
        title={t('devices.archiveConfirmTitle')}
        description={t('devices.archiveConfirmBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiving(null)} disabled={isArchiving}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmArchive} isLoading={isArchiving}>
              {t('devices.archivedToast')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground-muted">{archiving?.displayName}</p>
      </Modal>
    </PageTransition>
  );
}
