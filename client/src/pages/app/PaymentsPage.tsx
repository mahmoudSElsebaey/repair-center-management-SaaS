import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { DataTable, TableToolbar, type Column } from '@/components/tables/DataTable';
import { PageTransition } from '@/components/motion/primitives';
import { Select } from '@/components/forms/Fields';
import { invoicesApi } from '@/features/invoices/api';
import type { Payment } from '@/features/invoices/types';
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/domain';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale } from '@/lib/i18nText';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = activeLocale();

  useDocumentTitle(t('invoices.paymentsTitle'));

  const [method, setMethod] = useState<PaymentMethod | ''>('');

  const fetcher = useCallback(
    ({ page, limit, search }: { page: number; limit: number; search: string }) =>
      invoicesApi.listPayments({
        page,
        limit,
        search: search || undefined,
        method: method || undefined,
        sort: '-paidAt',
      }),
    [method]
  );

  const { items, meta, setPage, search, setSearch, isLoading, error, reload } =
    usePaginatedList<Payment>(fetcher);

  const columns = useMemo<Column<Payment>[]>(
    () => [
      {
        key: 'invoice',
        header: t('invoices.columns.number'),
        render: (row) => (
          <span className="font-medium tabular-nums">{row.invoiceNumber ?? '—'}</span>
        ),
      },
      {
        key: 'method',
        header: t('invoices.fields.method'),
        render: (row) => (
          <Badge tone="info">{t(`invoices.methods.${row.method}`)}</Badge>
        ),
      },
      {
        key: 'amount',
        header: t('invoices.fields.amount'),
        className: 'text-end',
        render: (row) => (
          <span className="numeric font-semibold text-success">
            {formatCurrency(row.amount, 'EGP', locale)}
          </span>
        ),
      },
      {
        key: 'reference',
        header: t('invoices.fields.reference'),
        render: (row) => row.reference ?? '—',
      },
      {
        key: 'by',
        header: t('invoices.columns.recordedBy'),
        render: (row) => row.recordedByName ?? '—',
      },
      {
        key: 'date',
        header: t('invoices.columns.date'),
        render: (row) => formatDate(row.paidAt, locale),
      },
    ],
    [t, locale]
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('invoices.paymentsTitle')}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{t('invoices.paymentsSubtitle')}</p>
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('invoices.paymentsSearchPlaceholder')}
          filters={
            <Select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as PaymentMethod | '');
                setPage(1);
              }}
              options={[
                { value: '', label: t('common.all') },
                ...PAYMENT_METHODS.map((m) => ({
                  value: m,
                  label: t(`invoices.methods.${m}`),
                })),
              ]}
              className="h-10 min-w-[10rem]"
              selectSize="sm"
            />
          }
        />

        <DataTable<Payment>
          columns={columns}
          rows={items}
          meta={meta}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/app/invoices/${row.invoice}`)}
          emptyTitle={t('invoices.paymentsEmpty')}
          emptyDescription={t('invoices.paymentsEmptyBody')}
        />
      </div>
    </PageTransition>
  );
}
