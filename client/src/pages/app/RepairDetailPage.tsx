import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Info,
  Pencil,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wrench,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/forms/Fields';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/feedback/Toast';
import { RepairHistory, RepairTimeline } from '@/features/repairs/components/RepairTimeline';
import { PriorityBadge, StatusBadge, TicketCode } from '@/features/repairs/components/TicketBadges';
import { repairsApi } from '@/features/repairs/api';
import type { RepairDetail, RepairStatus } from '@/features/repairs/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale, translate } from '@/lib/i18nText';
import { cn, formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';

/** Actions that need extra input before they can be submitted. */
const APPROVAL_ACTION: RepairStatus = 'approved';
const CANCEL_ACTION: RepairStatus = 'cancelled';

/**
 * Repair ticket detail.
 *
 * The workflow is the centre of this screen: the timeline shows where the ticket
 * is and what remains, and the action buttons are exactly the transitions the
 * server will accept — computed from the same table, so an offered button can
 * never be rejected.
 */
export default function RepairDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useToast();
  const locale = activeLocale();

  const [detail, setDetail] = useState<RepairDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [error, setError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<RepairStatus | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editEstimated, setEditEstimated] = useState('');
  const [editFinal, setEditFinal] = useState('');

  useDocumentTitle(detail ? detail.ticket.code : t('repairs.title'));

  const load = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    setError(null);

    try {
      const result = await repairsApi.get(id);
      setDetail(result);
      setStatus('ready');
    } catch (caught) {
      const message = getErrorMessage(caught, t('states.errorBody'));
      if (message.toLowerCase().includes('not found')) {
        setStatus('missing');
        return;
      }
      setError(message);
      setStatus('error');
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Opens the confirmation dialog, seeding any values it needs. */
  const beginAction = (target: RepairStatus) => {
    setPendingAction(target);
    setActionNote('');
    setRejectionReason('');
  };

  const confirmAction = async () => {
    if (!pendingAction || !detail) return;
    setIsSubmitting(true);

    try {
      await repairsApi.changeStatus(detail.ticket.id, {
        status: pendingAction,
        note: actionNote.trim() || undefined,
        // The approval move records the customer's decision with it.
        ...(pendingAction === APPROVAL_ACTION ? { customerApproved: true } : {}),
        ...(pendingAction === CANCEL_ACTION && rejectionReason.trim()
          ? { customerApproved: false, customerRejectionReason: rejectionReason.trim() }
          : {}),
      });

      notify.success(
        t('repairs.statusUpdated'),
        t('repairs.statusUpdatedBody', {
          code: detail.ticket.code,
          status: t(`repairs.status.${pendingAction}`),
        })
      );

      setPendingAction(null);
      await load();
    } catch (caught) {
      notify.error(t('states.errorTitle'), getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEdits = async () => {
    if (!detail) return;
    setIsSubmitting(true);

    try {
      await repairsApi.update(detail.ticket.id, {
        diagnosis: editDiagnosis.trim() || undefined,
        estimatedCost: editEstimated === '' ? undefined : Number(editEstimated),
        finalCost: editFinal === '' ? undefined : Number(editFinal),
      });

      notify.success(t('repairs.updatedToast'));
      setEditOpen(false);
      await load();
    } catch (caught) {
      notify.error(t('states.errorTitle'), getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = () => {
    if (!detail) return;
    setEditDiagnosis(detail.ticket.diagnosis ?? '');
    setEditEstimated(detail.ticket.estimatedCost?.toString() ?? '');
    setEditFinal(detail.ticket.finalCost?.toString() ?? '');
    setEditOpen(true);
  };

  /* ------------------------------------------------------------- states */
  if (status === 'loading') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl">
          <PageSkeleton rows={4} />
        </div>
      </PageTransition>
    );
  }

  if (status === 'missing' || !detail) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <EmptyState
            size="lg"
            icon={<Wrench className="h-6 w-6" />}
            title={t('repairs.notFound')}
            description={t('repairs.notFoundBody')}
            action={
              <Button variant="outline" onClick={() => navigate('/app/repairs')}>
                {t('repairs.title')}
              </Button>
            }
          />
        </div>
      </PageTransition>
    );
  }

  if (status === 'error') {
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

  const { ticket, customer, device, technician, availableActions, isTerminal } = detail;

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-5">
        {/* ---------------------------------------------------------- header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              to="/app/repairs"
              aria-label={t('repairs.title')}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 rf-flip-rtl" aria-hidden="true" />
            </Link>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold sm:text-3xl">
                  <TicketCode code={ticket.code} />
                </h1>
                <StatusBadge status={ticket.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground-subtle">
                <PriorityBadge priority={ticket.priority} size="sm" />
                <span>{device?.displayName ?? '—'}</span>
                <span aria-hidden="true">·</span>
                <span>{customer?.name ?? '—'}</span>
                {technician && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Wrench className="h-3 w-3" aria-hidden="true" />
                      {technician.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isTerminal && (
              <Button variant="outline" onClick={openEdit} leadingIcon={<Pencil className="h-4 w-4" />}>
                {t('common.edit')}
              </Button>
            )}

            {/* Exactly the moves the server will accept for this role and state. */}
            {availableActions.map((action) => {
              const isCancel = action.to === 'cancelled';
              const isDeliver = action.to === 'delivered';

              return (
                <Button
                  key={action.to}
                  variant={isCancel ? 'outline' : isDeliver ? 'success' : 'primary'}
                  leadingIcon={
                    isCancel ? (
                      <XCircle className="h-4 w-4" />
                    ) : isDeliver ? (
                      <HandCoins className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )
                  }
                  onClick={() => beginAction(action.to)}
                >
                  {t(action.labelKey)}
                </Button>
              );
            })}
          </div>
        </div>

        {isTerminal && (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <p className="text-sm text-foreground-muted">{t('repairs.closedNotice')}</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          {/* ------------------------------------------------------ main */}
          <div className="space-y-5">
            <Card>
              <CardHeader title={t('repairs.issueSection')} />
              <p className="whitespace-pre-line px-2 text-sm leading-relaxed text-foreground-muted">
                {ticket.issue}
              </p>
            </Card>

            <Card>
              <CardHeader
                title={t('repairs.diagnosisSection')}
                action={
                  !isTerminal ? (
                    <Button variant="ghost" size="sm" onClick={openEdit}>
                      {t('common.edit')}
                    </Button>
                  ) : undefined
                }
              />
              {ticket.diagnosis ? (
                <p className="whitespace-pre-line px-2 text-sm leading-relaxed text-foreground-muted">
                  {ticket.diagnosis}
                </p>
              ) : (
                <p className="px-2 text-sm text-foreground-subtle">{t('repairs.diagnosisEmpty')}</p>
              )}
            </Card>

            {/* ------------------------------------------------------ costs */}
            <Card>
              <CardHeader title={t('repairs.costsSection')} />

              {ticket.estimatedCost === undefined && ticket.finalCost === undefined ? (
                <p className="px-2 text-sm text-foreground-subtle">{t('repairs.costsEmpty')}</p>
              ) : (
                <dl className="grid gap-4 px-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-foreground-subtle">{t('repairs.estimate')}</dt>
                    <dd className="numeric mt-1 text-lg font-semibold text-foreground">
                      {ticket.estimatedCost === undefined
                        ? t('repairs.noEstimate')
                        : formatCurrency(ticket.estimatedCost, 'EGP', locale)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-foreground-subtle">{t('repairs.final')}</dt>
                    <dd
                      className={cn(
                        'numeric mt-1 text-lg font-semibold',
                        ticket.finalCost === undefined ? 'text-foreground-subtle' : 'text-success'
                      )}
                    >
                      {ticket.finalCost === undefined
                        ? t('common.notAvailable')
                        : formatCurrency(ticket.finalCost, 'EGP', locale)}
                    </dd>
                  </div>
                </dl>
              )}

              {/* The customer decision is a fact about the ticket, not a note. */}
              <div className="mt-5 border-t border-border px-2 pt-4">
                <p className="text-xs text-foreground-subtle">{t('repairs.approvalSection')}</p>

                {ticket.customerApproved === true ? (
                  <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {t('repairs.approvalApproved')}
                    {ticket.customerApprovedAt && (
                      <span className="font-normal text-foreground-subtle">
                        {t('repairs.approvalOn', {
                          date: formatDate(ticket.customerApprovedAt, locale),
                        })}
                      </span>
                    )}
                  </p>
                ) : ticket.customerApproved === false ? (
                  <div className="mt-1.5">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-danger">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      {t('repairs.approvalRejected')}
                    </p>
                    {ticket.customerRejectionReason && (
                      <p className="mt-1 text-xs text-foreground-subtle">
                        {t('repairs.rejectionReason')}: {ticket.customerRejectionReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1.5 text-sm text-foreground-subtle">
                    {t('repairs.approvalPending')}
                  </p>
                )}
              </div>

              <p className="mt-4 px-2 text-xs text-foreground-subtle">
                {t('repairs.registerPaymentNotice')}
              </p>
            </Card>

            {(ticket.notes || ticket.statusHistory.length > 0) && (
              <Card>
                <CardHeader title={t('repairs.historySection')} />
                <div className="px-2">
                  <RepairHistory history={ticket.statusHistory} />
                </div>
              </Card>
            )}

            {ticket.notes && (
              <Card>
                <CardHeader title={t('repairs.notesSection')} />
                <p className="whitespace-pre-line px-2 text-sm text-foreground-muted">
                  {ticket.notes}
                </p>
              </Card>
            )}
          </div>

          {/* ------------------------------------------------------ side */}
          <div className="space-y-5">
            <Card>
              <CardHeader
                title={t('repairs.timeline.progress', {
                  current: Math.max(happyPathIndex(ticket.status) + 1, 1),
                  total: HAPPY_PATH.length,
                })}
              />
              <div className="px-2">
                <RepairTimeline status={ticket.status} history={ticket.statusHistory} />
              </div>
            </Card>

            <Card>
              <CardHeader title={t('repairs.customerSection')} />
              {customer ? (
                <div className="space-y-2 px-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <UserRound className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                    {customer.name}
                  </p>
                  <p className="numeric text-xs text-foreground-subtle" dir="ltr">
                    {customer.customerCode} · {customer.phone}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => navigate(`/app/customers/${customer.id}`)}
                  >
                    {t('repairs.viewCustomer')}
                  </Button>
                </div>
              ) : (
                <p className="px-2 text-sm text-foreground-subtle">{t('common.notAvailable')}</p>
              )}
            </Card>

            <Card>
              <CardHeader title={t('repairs.deviceSection')} />
              {device ? (
                <div className="space-y-2 px-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Smartphone className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                    {device.displayName}
                  </p>
                  <p className="text-xs text-foreground-subtle">
                    {t(`devices.types.${device.deviceType}`)}
                    {device.serialNumber && ` · ${device.serialNumber}`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => navigate(`/app/devices/${device.id}`)}
                  >
                    {t('repairs.viewDevice')}
                  </Button>
                </div>
              ) : (
                <p className="px-2 text-sm text-foreground-subtle">{t('common.notAvailable')}</p>
              )}
            </Card>

            <Card>
              <CardHeader title={t('repairs.warrantySection')} />
              <p className="flex items-center gap-2 px-2 text-sm text-foreground-muted">
                <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {t('repairs.warrantyValue', { days: ticket.warrantyDays })}
              </p>
            </Card>

            <Card>
              <CardHeader title={t('common.dates')} />
              <dl className="space-y-2 px-2 text-sm">
                <DateRow label={t('repairs.received')} value={formatDate(ticket.createdAt, locale)} />
                {ticket.expectedCompletionAt && (
                  <DateRow
                    label={t('repairs.expectedCompletion')}
                    value={formatDate(ticket.expectedCompletionAt, locale)}
                  />
                )}
                {ticket.completedAt && (
                  <DateRow label={t('repairs.completedAt')} value={formatDate(ticket.completedAt, locale)} />
                )}
                {ticket.deliveredAt && (
                  <DateRow label={t('repairs.deliveredAt')} value={formatDate(ticket.deliveredAt, locale)} />
                )}
              </dl>
            </Card>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- confirm action */}
      <Modal
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        size="md"
        title={pendingAction ? t(`repairs.actions.${actionKeyFor(pendingAction)}`) : ''}
        description={t('repairs.changeStatusBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingAction(null)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={pendingAction === 'cancelled' ? 'danger' : 'primary'}
              onClick={confirmAction}
              isLoading={isSubmitting}
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5">
            <CalendarClock className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">{translate('repairs.updateStatus')}</p>
              <p className="mt-0.5 text-xs text-foreground-subtle">
                {pendingAction ? t(`repairs.status.${pendingAction}`) : ''}
              </p>
            </div>
          </div>

          {pendingAction === APPROVAL_ACTION && (
            <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success-soft px-3.5 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <p className="text-sm text-foreground">{t('repairs.confirmApprove')}</p>
            </div>
          )}

          {pendingAction === CANCEL_ACTION && (
            <>
              <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                <p className="text-sm text-foreground">{t('repairs.confirmCancel')}</p>
              </div>

              <Input
                label={t('repairs.rejectionReasonLabel')}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </>
          )}

          <Textarea
            label={t('repairs.noteLabel')}
            placeholder={t('repairs.notePlaceholder')}
            rows={2}
            value={actionNote}
            onChange={(event) => setActionNote(event.target.value)}
          />
        </div>
      </Modal>

      {/* ------------------------------------------------------- edit panel */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        size="md"
        title={t('repairs.updateStatus')}
        description={t('repairs.diagnosisSection')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveEdits} isLoading={isSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label={t('repairs.fields.diagnosis')}
            placeholder={t('repairs.fields.diagnosisPlaceholder')}
            rows={4}
            value={editDiagnosis}
            onChange={(event) => setEditDiagnosis(event.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('repairs.fields.estimatedCost')}
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={editEstimated}
              onChange={(event) => setEditEstimated(event.target.value)}
            />

            <Input
              label={t('repairs.fields.finalCost')}
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={editFinal}
              onChange={(event) => setEditFinal(event.target.value)}
            />
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-foreground-subtle">{label}</dt>
      <dd className="numeric text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Maps a target status back to its action label key.
 *
 * Several statuses have more than one way in (`in_repair` can be reached from
 * `diagnosing`, `approved` or `waiting_parts`), so the confirmation dialog shows
 * the generic label for those and a specific one where the wording matters.
 */
function actionKeyFor(status: RepairStatus): string {
  switch (status) {
    case 'approved':
      return 'recordApproval';
    case 'cancelled':
      return 'cancel';
    case 'ready':
      return 'markReady';
    case 'delivered':
      return 'deliver';
    case 'waiting_parts':
      return 'waitForParts';
    case 'waiting_customer':
      return 'sendForApproval';
    case 'diagnosing':
      return 'startDiagnosis';
    default:
      return 'startRepair';
  }
}

export { Select };
