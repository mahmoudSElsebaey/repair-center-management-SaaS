import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/forms/Fields';
import { DataTable, TableToolbar, type Column } from '@/components/tables/DataTable';
import { PageTransition } from '@/components/motion/primitives';
import { StaffFormDialog } from '@/features/staff/components/StaffFormDialog';
import { staffApi } from '@/features/staff/api';
import type { StaffBranch, StaffMember } from '@/features/staff/types';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { USER_ROLES, type UserRole } from '@/types/domain';
import { useAppSelector } from '@/store/hooks';
import { formatDate } from '@/lib/utils';
import { activeLocale } from '@/lib/i18nText';

export default function StaffPage() {
  const { t } = useTranslation();
  const locale = activeLocale();
  const actor = useAppSelector((s) => s.auth.user);
  const canManage = actor?.role === 'super_admin' || actor?.role === 'admin';

  useDocumentTitle(t('staff.title'));

  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [activeFilter, setActiveFilter] = useState<'true' | 'false' | ''>('true');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [branches, setBranches] = useState<StaffBranch[]>([]);

  useEffect(() => {
    void staffApi.branches().then(setBranches).catch(() => setBranches([]));
  }, []);

  const fetcher = useCallback(
    ({ page, limit, search }: { page: number; limit: number; search: string }) =>
      staffApi.list({
        page,
        limit,
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter || undefined,
        sort: 'name',
      }),
    [roleFilter, activeFilter]
  );

  const { items, meta, setPage, search, setSearch, isLoading, error, reload } =
    usePaginatedList<StaffMember>(fetcher);

  const columns = useMemo<Column<StaffMember>[]>(
    () => [
      {
        key: 'name',
        header: t('staff.fields.name'),
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.name}</p>
            <p className="mt-0.5 truncate text-2xs text-foreground-subtle" dir="ltr">
              {row.email}
            </p>
          </div>
        ),
      },
      {
        key: 'role',
        header: t('staff.fields.role'),
        render: (row) => (
          <Badge tone="primary" size="sm">
            {t(`roles.${row.role}`)}
          </Badge>
        ),
      },
      {
        key: 'branch',
        header: t('staff.fields.branch'),
        render: (row) => (
          <span className="text-foreground-muted">
            {row.branch?.name ?? t('staff.fields.branchNone')}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('staff.fields.status'),
        render: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'} size="sm">
            {row.isActive ? t('staff.active') : t('staff.inactive')}
          </Badge>
        ),
      },
      {
        key: 'lastLogin',
        header: t('staff.fields.lastLogin'),
        render: (row) => (
          <span className="text-foreground-subtle">
            {row.lastLogin ? formatDate(row.lastLogin, locale) : t('common.notAvailable')}
          </span>
        ),
      },
    ],
    [t, locale]
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('staff.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('staff.subtitle')}</p>
          </div>
          {canManage && (
            <Button
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('staff.add')}
            </Button>
          )}
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('staff.searchPlaceholder')}
          filters={
            <div className="flex flex-wrap gap-2">
              <Select
                selectSize="md"
                className="w-44"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as UserRole | '');
                  setPage(1);
                }}
                options={[
                  { value: '', label: t('staff.filters.allRoles') },
                  ...USER_ROLES.map((role) => ({ value: role, label: t(`roles.${role}`) })),
                ]}
              />
              <Select
                selectSize="md"
                className="w-36"
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value as 'true' | 'false' | '');
                  setPage(1);
                }}
                options={[
                  { value: '', label: t('common.all') },
                  { value: 'true', label: t('staff.active') },
                  { value: 'false', label: t('staff.inactive') },
                ]}
              />
            </div>
          }
        />

        <DataTable<StaffMember>
          columns={columns}
          rows={items}
          meta={meta}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          onPageChange={setPage}
          onRowClick={
            canManage
              ? (row) => {
                  setEditing(row);
                  setFormOpen(true);
                }
              : undefined
          }
          emptyTitle={t('staff.empty')}
          emptyDescription={t('staff.emptyBody')}
          emptyAction={
            canManage ? (
              <Button
                leadingIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                {t('staff.add')}
              </Button>
            ) : undefined
          }
        />
      </div>

      {canManage && (
        <StaffFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={() => reload()}
          member={editing}
          branches={branches}
        />
      )}
    </PageTransition>
  );
}
