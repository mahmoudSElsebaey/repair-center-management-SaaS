import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableToolbar, type Column } from '@/components/tables/DataTable';
import { PageTransition } from '@/components/motion/primitives';
import { Select } from '@/components/forms/Fields';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/feedback/Toast';
import { invoicesApi } from '@/features/invoices/api';
import type { Invoice } from '@/features/invoices/types';
import { INVOICE_STATUSES, type InvoiceStatus, type UserRole } from '@/types/domain';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppSelector } from '@/store/hooks';
import { activeLocale } from '@/lib/i18nText';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';

const MANAGE_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'receptionist'];

const STATUS_TONE: Record<InvoiceStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'neutral',
  issued: 'info',
  partially_paid: 'warning',
  paid: 'success',
  void: 'danger',
};

export default function InvoicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useToast();
  const locale = activeLocale();
  const user = useAppSelector((s) => s.auth.user);
  const canManage = user?.role ? MANAGE_ROLES.includes(user.role) : false;

  useDocumentTitle(t('invoices.title'));

  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [repairId, setRepairId] = useState('');
  const [creating, setCreating] = useState(false);

  const fetcher = useCallback(
    ({ page, limit, search }: { page: number; limit: number; search: string }) =>
      invoicesApi.list({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        sort: '-createdAt',
      }),
    [status]
  );

  const { items, meta, setPage, search, setSearch, isLoading, error, reload } =
    usePaginatedList<Invoice>(fetcher);

  const columns = useMemo<Column<Invoice>[]>(
    () => [
      {
        key: 'number',
        header: t('invoices.columns.number'),
        render: (row) => <span className="font-medium tabular-nums">{row.number}</span>,
      },
      {
        key: 'repair',
        header: t('invoices.columns.repair'),
        render: (row) => row.repairCode ?? '—',
      },
      {
        key: 'status',
        header: t('invoices.columns.status'),
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status]}>{t(`invoices.status.${row.status}`)}</Badge>
        ),
      },
      {
        key: 'total',
        header: t('invoices.columns.total'),
        className: 'text-end',
        render: (row) => (
          <span className="numeric font-medium">{formatCurrency(row.total, 'EGP', locale)}</span>
        ),
      },
      {
        key: 'balance',
        header: t('invoices.columns.balance'),
        className: 'text-end',
        render: (row) => (
          <span className="numeric">{formatCurrency(row.balance, 'EGP', locale)}</span>
        ),
      },
      {
        key: 'date',
        header: t('invoices.columns.date'),
        render: (row) => formatDate(row.issuedAt ?? row.createdAt, locale),
      },
    ],
    [t, locale]
  );

  const handleCreate = async () => {
    if (!repairId.trim()) {
      notify.error(t('invoices.validation.repairRequired'));
      return;
    }
    setCreating(true);
    try {
      const result = await invoicesApi.create({
        repairTicketId: repairId.trim(),
        issueImmediately: true,
      });
      notify.success(t('invoices.createdToast'));
      setCreateOpen(false);
      setRepairId('');
      navigate(`/app/invoices/${result.invoice.id}`);
    } catch (caught) {
      notify.error(getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('invoices.title')}</h1>
            <p className="mt-1 text-sm text-foreground-muted">{t('invoices.subtitle')}</p>
          </div>
          {canManage && (
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              {t('invoices.createFromRepair')}
            </Button>
          )}
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('invoices.searchPlaceholder')}
          filters={
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as InvoiceStatus | '');
                setPage(1);
              }}
              options={[
                { value: '', label: t('common.all') },
                ...INVOICE_STATUSES.map((s) => ({
                  value: s,
                  label: t(`invoices.status.${s}`),
                })),
              ]}
              className="h-10 min-w-[10rem]"
              selectSize="sm"
            />
          }
        />

        <DataTable<Invoice>
          columns={columns}
          rows={items}
          meta={meta}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/app/invoices/${row.id}`)}
          emptyTitle={t('invoices.empty')}
          emptyDescription={t('invoices.emptyBody')}
          emptyAction={
            canManage ? (
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                {t('invoices.createFromRepair')}
              </Button>
            ) : undefined
          }
        />
      </div>

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title={t('invoices.createFromRepair')}
        footer={
          <>
            <Button variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button isLoading={creating} onClick={() => void handleCreate()}>
              {t('invoices.issue')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-foreground-muted">{t('invoices.createHint')}</p>
          <Input
            label={t('invoices.fields.repairTicketId')}
            value={repairId}
            onChange={(e) => setRepairId(e.target.value)}
            placeholder={t('invoices.fields.repairTicketIdPlaceholder')}
            dir="ltr"
          />
        </div>
      </Modal>
    </PageTransition>
  );
}
