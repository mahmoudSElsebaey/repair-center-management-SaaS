import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  UserRound,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/forms/Fields';
import { PageTransition } from '@/components/motion/primitives';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/feedback/Toast';
import { appointmentsApi } from '@/features/appointments/api';
import type { Appointment, CreateAppointmentPayload } from '@/features/appointments/types';
import { customersApi } from '@/features/customers/api';
import { staffApi } from '@/features/staff/api';
import type { StaffMember } from '@/features/staff/types';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  type AppointmentStatus,
  type AppointmentType,
  type UserRole,
} from '@/types/domain';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppSelector } from '@/store/hooks';
import { activeLocale } from '@/lib/i18nText';
import { cn, getErrorMessage } from '@/lib/utils';

const MANAGE_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'receptionist'];

const STATUS_TONE: Record<
  AppointmentStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  scheduled: 'info',
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  no_show: 'warning',
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d: Date, weekStartsOnMonday = true): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = weekStartsOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  return addDays(x, diff);
}

function toLocalInputValue(isoOrDate: Date): string {
  const d = new Date(isoOrDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDayLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const notify = useToast();
  const locale = activeLocale();
  const user = useAppSelector((s) => s.auth.user);
  const canManage = user?.role ? MANAGE_ROLES.includes(user.role) : false;

  useDocumentTitle(t('appointments.title'));

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<AppointmentType>('consultation');
  const [customerId, setCustomerId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date()));
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [customerOptions, setCustomerOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [technicians, setTechnicians] = useState<StaffMember[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await appointmentsApi.calendar({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
        status: statusFilter || undefined,
      });
      setItems(Array.isArray(data) ? data : []);
      setStatus('ready');
    } catch (caught) {
      setError(getErrorMessage(caught, t('states.errorBody')));
      setStatus('error');
    }
  }, [weekStart, weekEnd, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!createOpen) return;
    void (async () => {
      try {
        const techResult = await staffApi.list({ role: 'technician', limit: 50, isActive: 'true' });
        setTechnicians(techResult.items ?? []);
      } catch {
        setTechnicians([]);
      }
    })();
  }, [createOpen]);

  useEffect(() => {
    if (!createOpen) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await customersApi.list({
            search: customerSearch || undefined,
            limit: 20,
            page: 1,
          });
          setCustomerOptions(
            (result.items ?? []).map((c) => ({
              value: c.id,
              label: `${c.name}${c.customerCode ? ` · ${c.customerCode}` : ''}`,
            }))
          );
        } catch {
          setCustomerOptions([]);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [createOpen, customerSearch]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) {
      map.set(startOfDay(day).toISOString(), []);
    }
    for (const appt of items) {
      const key = startOfDay(new Date(appt.startsAt)).toISOString();
      const list = map.get(key);
      if (list) list.push(appt);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [days, items]);

  const openCreate = (day?: Date) => {
    const base = day ? new Date(day) : new Date();
    if (day) base.setHours(10, 0, 0, 0);
    setTitle('');
    setType('consultation');
    setCustomerId('');
    setTechnicianId('');
    setStartsAt(toLocalInputValue(base));
    setDuration('30');
    setNotes('');
    setCustomerSearch('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !customerId) {
      notify.error(t('appointments.validation.required'));
      return;
    }
    const durationMinutes = Number(duration) || 30;
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) {
      notify.error(t('appointments.validation.invalidTime'));
      return;
    }

    const payload: CreateAppointmentPayload = {
      customerId,
      technicianId: technicianId || null,
      title: title.trim(),
      type,
      startsAt: start.toISOString(),
      durationMinutes,
      notes: notes.trim() || null,
      status: 'scheduled',
    };

    setCreating(true);
    try {
      await appointmentsApi.create(payload);
      notify.success(t('appointments.createdToast'));
      setCreateOpen(false);
      await load();
    } catch (caught) {
      notify.error(getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (
    id: string,
    action: 'confirm' | 'complete' | 'cancel' | 'noShow'
  ) => {
    setActionId(id);
    try {
      if (action === 'confirm') await appointmentsApi.confirm(id);
      else if (action === 'complete') await appointmentsApi.complete(id);
      else if (action === 'cancel') await appointmentsApi.cancel(id);
      else await appointmentsApi.noShow(id);
      notify.success(t(`appointments.${action}Toast`));
      await load();
    } catch (caught) {
      notify.error(getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setActionId(null);
    }
  };

  if (status === 'loading' && items.length === 0) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-7xl">
          <PageSkeleton rows={4} />
        </div>
      </PageTransition>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <ErrorState
            title={t('states.errorTitle')}
            description={error ?? t('states.errorBody')}
            onRetry={load}
            retryLabel={t('common.retry')}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('appointments.title')}</h1>
            <p className="mt-1 text-sm text-foreground-muted">{t('appointments.subtitle')}</p>
          </div>
          {canManage && (
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
              {t('appointments.create')}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label={t('appointments.prevWeek')}
              onClick={() => setWeekStart((w) => addDays(w, -7))}
            >
              <ChevronLeft className="h-4 w-4 rf-flip-rtl" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              {t('appointments.today')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={t('appointments.nextWeek')}
              onClick={() => setWeekStart((w) => addDays(w, 7))}
            >
              <ChevronRight className="h-4 w-4 rf-flip-rtl" />
            </Button>
            <p className="ms-2 text-sm font-medium text-foreground">
              {formatDayLabel(weekStart, locale)} — {formatDayLabel(addDays(weekStart, 6), locale)}
            </p>
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
            options={[
              { value: '', label: t('appointments.activeOnly') },
              ...APPOINTMENT_STATUSES.map((s) => ({
                value: s,
                label: t(`appointments.status.${s}`),
              })),
            ]}
            className="h-10 min-w-[11rem]"
            selectSize="sm"
          />
        </div>

        {items.length === 0 ? (
          <EmptyState
            size="lg"
            icon={<CalendarDays className="h-6 w-6" />}
            title={t('appointments.empty')}
            description={t('appointments.emptyBody')}
            action={
              canManage ? (
                <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
                  {t('appointments.create')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-7">
            {days.map((day) => {
              const key = startOfDay(day).toISOString();
              const dayItems = byDay.get(key) ?? [];
              const isToday = startOfDay(day).getTime() === startOfDay(new Date()).getTime();

              return (
                <Card
                  key={key}
                  className={cn('flex min-h-[14rem] flex-col', isToday && 'ring-1 ring-primary/40')}
                >
                  <CardHeader
                    title={formatDayLabel(day, locale)}
                    action={
                      canManage ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreate(day)}
                          aria-label={t('appointments.create')}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : undefined
                    }
                  />
                  <div className="flex flex-1 flex-col gap-2 px-2 pb-3">
                    {dayItems.length === 0 ? (
                      <p className="px-1 text-xs text-foreground-subtle">{t('appointments.noSlots')}</p>
                    ) : (
                      dayItems.map((appt) => (
                        <div
                          key={appt.id}
                          className="rounded-lg border border-border bg-surface/60 p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold leading-snug text-foreground">
                              {appt.title}
                            </p>
                            <Badge tone={STATUS_TONE[appt.status]} size="sm">
                              {t(`appointments.status.${appt.status}`)}
                            </Badge>
                          </div>
                          <p className="mt-1.5 flex items-center gap-1.5 text-2xs text-foreground-muted">
                            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="numeric" dir="ltr">
                              {formatTime(appt.startsAt, locale)} – {formatTime(appt.endsAt, locale)}
                            </span>
                          </p>
                          {appt.customerName && (
                            <p className="mt-1 flex items-center gap-1.5 text-2xs text-foreground-subtle">
                              <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                              {appt.customerName}
                            </p>
                          )}
                          {appt.technicianName && (
                            <p className="mt-0.5 text-2xs text-foreground-subtle">
                              {t('appointments.withTech', { name: appt.technicianName })}
                            </p>
                          )}
                          {canManage &&
                            (appt.status === 'scheduled' || appt.status === 'confirmed') && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {appt.status === 'scheduled' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    isLoading={actionId === appt.id}
                                    onClick={() => void runAction(appt.id, 'confirm')}
                                  >
                                    {t('appointments.confirm')}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leadingIcon={<CheckCircle2 className="h-3 w-3" />}
                                  isLoading={actionId === appt.id}
                                  onClick={() => void runAction(appt.id, 'complete')}
                                >
                                  {t('appointments.complete')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leadingIcon={<XCircle className="h-3 w-3" />}
                                  isLoading={actionId === appt.id}
                                  onClick={() => void runAction(appt.id, 'cancel')}
                                >
                                  {t('appointments.cancel')}
                                </Button>
                              </div>
                            )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title={t('appointments.create')}
        footer={
          <>
            <Button variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button isLoading={creating} onClick={() => void handleCreate()}>
              {t('appointments.schedule')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('appointments.fields.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('appointments.fields.titlePlaceholder')}
          />

          <Select
            label={t('appointments.fields.type')}
            value={type}
            onChange={(e) => setType(e.target.value as AppointmentType)}
            options={APPOINTMENT_TYPES.map((tp) => ({
              value: tp,
              label: t(`appointments.types.${tp}`),
            }))}
          />

          <div className="space-y-2">
            <Input
              label={t('appointments.fields.customerSearch')}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder={t('appointments.fields.customerSearchPlaceholder')}
            />
            <Select
              label={t('appointments.fields.customer')}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={[
                { value: '', label: t('appointments.fields.customerPlaceholder') },
                ...customerOptions,
              ]}
            />
          </div>

          <Select
            label={t('appointments.fields.technician')}
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            options={[
              { value: '', label: t('appointments.fields.technicianOptional') },
              ...technicians.map((tech) => ({
                value: tech.id,
                label: tech.name,
              })),
            ]}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('appointments.fields.startsAt')}
              type="datetime-local"
              dir="ltr"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <Select
              label={t('appointments.fields.duration')}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              options={[
                { value: '15', label: t('appointments.duration.m15') },
                { value: '30', label: t('appointments.duration.m30') },
                { value: '45', label: t('appointments.duration.m45') },
                { value: '60', label: t('appointments.duration.m60') },
                { value: '90', label: t('appointments.duration.m90') },
                { value: '120', label: t('appointments.duration.m120') },
              ]}
            />
          </div>

          <Textarea
            label={t('appointments.fields.notes')}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('appointments.fields.notesPlaceholder')}
          />

          <p className="text-xs text-foreground-subtle">{t('appointments.conflictHint')}</p>
        </div>
      </Modal>
    </PageTransition>
  );
}
