import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ArrowLeftRight, PackagePlus, Pencil, Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableToolbar, type Column } from '@/components/tables/DataTable';
import { PageTransition } from '@/components/motion/primitives';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/forms/Fields';
import { useToast } from '@/components/feedback/Toast';
import { InventoryFormDialog } from '@/features/inventory/components/InventoryFormDialog';
import { StockMovementDialog } from '@/features/inventory/components/StockMovementDialog';
import { inventoryApi } from '@/features/inventory/api';
import type { InventoryItem } from '@/features/inventory/types';
import { INVENTORY_CATEGORIES, type InventoryCategory } from '@/types/domain';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppSelector } from '@/store/hooks';
import type { UserRole } from '@/types/domain';

const MANAGE_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'inventory_manager'];

export default function InventoryPage() {
  const { t } = useTranslation();
  const notify = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const canManage = user?.role ? MANAGE_ROLES.includes(user.role) : false;

  useDocumentTitle(t('inventory.title'));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [archiving, setArchiving] = useState<InventoryItem | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [category, setCategory] = useState<InventoryCategory | ''>('');

  const fetcher = useCallback(
    ({ page, limit, search }: { page: number; limit: number; search: string }) =>
      inventoryApi.list({
        page,
        limit,
        search: search || undefined,
        lowStock: lowStockOnly ? 'true' : undefined,
        category: category || undefined,
        isActive: 'true',
        sort: 'name',
      }),
    [lowStockOnly, category]
  );

  const { items, meta, setPage, search, setSearch, isLoading, error, reload } =
    usePaginatedList<InventoryItem>(fetcher);

  const columns = useMemo<Column<InventoryItem>[]>(
    () => [
      {
        key: 'name',
        header: t('inventory.fields.name'),
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.name}</p>
            <p className="numeric mt-0.5 truncate text-2xs text-foreground-subtle" dir="ltr">
              {row.sku}
              {row.brand ? ` · ${row.brand}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'category',
        header: t('inventory.fields.category'),
        className: 'w-28',
        render: (row) => (
          <span className="text-foreground-muted">{t(`inventory.categories.${row.category}`)}</span>
        ),
      },
      {
        key: 'qty',
        header: t('inventory.fields.quantity'),
        className: 'w-28',
        render: (row) => (
          <span className="numeric font-medium" dir="ltr">
            {row.quantityOnHand} {row.unit}
          </span>
        ),
      },
      {
        key: 'min',
        header: t('inventory.fields.minQuantity'),
        className: 'w-20',
        render: (row) => (
          <span className="numeric text-foreground-subtle" dir="ltr">
            {row.minQuantity}
          </span>
        ),
      },
      {
        key: 'location',
        header: t('inventory.fields.location'),
        className: 'w-24',
        render: (row) => (
          <span className="text-foreground-muted">{row.location || '—'}</span>
        ),
      },
      {
        key: 'status',
        header: t('inventory.fields.status'),
        className: 'w-28',
        render: (row) => {
          if (row.isOutOfStock) {
            return (
              <Badge tone="danger" withDot size="sm">
                {t('inventory.status.out')}
              </Badge>
            );
          }
          if (row.isLowStock) {
            return (
              <Badge tone="warning" withDot size="sm">
                {t('inventory.status.low')}
              </Badge>
            );
          }
          return (
            <Badge tone="success" withDot size="sm">
              {t('inventory.status.ok')}
            </Badge>
          );
        },
      },
    ],
    [t]
  );

  const confirmArchive = async () => {
    if (!archiving) return;
    setIsArchiving(true);
    try {
      await inventoryApi.archive(archiving.id);
      notify.success(t('inventory.archivedToast'));
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
            <h1 className="text-2xl font-bold sm:text-3xl">{t('inventory.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('inventory.subtitle')}</p>
          </div>

          {canManage && (
            <Button
              leadingIcon={<PackagePlus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('inventory.add')}
            </Button>
          )}
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('inventory.searchPlaceholder')}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground-muted">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(event) => {
                    setLowStockOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-2 focus:ring-primary/50"
                />
                {t('inventory.lowStockOnly')}
              </label>

              <Select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as InventoryCategory | '');
                  setPage(1);
                }}
                options={[
                  { value: '', label: t('inventory.allCategories') },
                  ...INVENTORY_CATEGORIES.map((c) => ({
                    value: c,
                    label: t(`inventory.categories.${c}`),
                  })),
                ]}
                className="h-10 min-w-[10rem]"
              />
            </div>
          }
        />

        <DataTable<InventoryItem>
          columns={columns}
          rows={items}
          meta={meta}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          onPageChange={setPage}
          emptyTitle={t('inventory.empty')}
          emptyDescription={t('inventory.emptyBody')}
          emptyAction={
            canManage ? (
              <Button
                leadingIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                {t('inventory.add')}
              </Button>
            ) : undefined
          }
          rowActions={
            canManage
              ? (row) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title={t('inventory.recordMovement')}
                      aria-label={t('inventory.recordMovement')}
                      onClick={() => setMovementItem(row)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
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
                    <button
                      type="button"
                      title={t('inventory.archive')}
                      aria-label={`${t('inventory.archive')} ${row.name}`}
                      onClick={() => setArchiving(row)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-danger-soft hover:text-danger"
                    >
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )
              : undefined
          }
        />
      </div>

      <InventoryFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        item={editing}
      />

      <StockMovementDialog
        open={Boolean(movementItem)}
        onClose={() => setMovementItem(null)}
        onSaved={reload}
        item={movementItem}
      />

      <Modal
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        size="sm"
        title={t('inventory.archiveConfirmTitle')}
        description={t('inventory.archiveConfirmBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiving(null)} disabled={isArchiving}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmArchive} isLoading={isArchiving}>
              {t('inventory.archive')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground-muted">{archiving?.name}</p>
      </Modal>
    </PageTransition>
  );
}
