import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Ban, CheckCircle2, CreditCard, FileText, Send } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/forms/Fields';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/feedback/Toast';
import { invoicesApi } from '@/features/invoices/api';
import type { Invoice, InvoiceDetailCustomer, Payment } from '@/features/invoices/types';
import { PAYMENT_METHODS, type InvoiceStatus, type PaymentMethod, type UserRole } from '@/types/domain';
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

export default function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useToast();
  const locale = activeLocale();
  const user = useAppSelector((s) => s.auth.user);
  const canManage = user?.role ? MANAGE_ROLES.includes(user.role) : false;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customer, setCustomer] = useState<InvoiceDetailCustomer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useDocumentTitle(invoice ? invoice.number : t('invoices.title'));

  const load = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    setError(null);
    try {
      const data = await invoicesApi.get(id);
      setInvoice(data.invoice);
      setPayments(data.payments);
      setCustomer(data.customer);
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

  const openPay = () => {
    if (!invoice) return;
    setAmount(String(invoice.balance));
    setMethod('cash');
    setReference('');
    setNotes('');
    setPayOpen(true);
  };

  const handlePay = async () => {
    if (!invoice) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      notify.error(t('invoices.validation.amountRequired'));
      return;
    }
    setBusy(true);
    try {
      await invoicesApi.recordPayment(invoice.id, {
        amount: value,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      notify.success(t('invoices.paymentRecordedToast'));
      setPayOpen(false);
      await load();
    } catch (caught) {
      notify.error(getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setBusy(false);
    }
  };

  const handleIssue = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      await invoicesApi.issue(invoice.id);
      notify.success(t('invoices.issuedToast'));
      await load();
    } catch (caught) {
      notify.error(getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      await invoicesApi.void(invoice.id);
      notify.success(t('invoices.voidedToast'));
      await load();
    } catch (caught) {
      notify.error(getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-5xl">
          <PageSkeleton rows={4} />
        </div>
      </PageTransition>
    );
  }

  if (status === 'missing' || !invoice) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <EmptyState
            size="lg"
            icon={<FileText className="h-6 w-6" />}
            title={t('invoices.notFound')}
            description={t('invoices.notFoundBody')}
            action={
              <Button variant="outline" onClick={() => navigate('/app/invoices')}>
                {t('invoices.title')}
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

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              to="/app/invoices"
              aria-label={t('invoices.title')}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 rf-flip-rtl" aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tabular-nums sm:text-3xl">{invoice.number}</h1>
                <Badge tone={STATUS_TONE[invoice.status]}>{t(`invoices.status.${invoice.status}`)}</Badge>
              </div>
              <p className="mt-1 text-sm text-foreground-subtle">
                {customer ? customer.name : '—'}
                {invoice.repairCode && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <Link to={`/app/repairs/${invoice.repairTicket}`} className="text-primary hover:underline">
                      {invoice.repairCode}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              {invoice.status === 'draft' && (
                <Button leadingIcon={<Send className="h-4 w-4" />} disabled={busy} onClick={() => void handleIssue()}>
                  {t('invoices.issue')}
                </Button>
              )}
              {(invoice.status === 'issued' || invoice.status === 'partially_paid') && (
                <Button leadingIcon={<CreditCard className="h-4 w-4" />} disabled={busy} onClick={openPay}>
                  {t('invoices.recordPayment')}
                </Button>
              )}
              {(invoice.status === 'draft' || invoice.status === 'issued') && invoice.amountPaid === 0 && (
                <Button variant="outline" leadingIcon={<Ban className="h-4 w-4" />} disabled={busy} onClick={() => void handleVoid()}>
                  {t('invoices.void')}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader title={t('invoices.linesSection')} />
              <div className="overflow-x-auto px-2">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-start text-xs text-foreground-subtle">
                      <th className="py-2 pe-3 font-medium">{t('invoices.fields.description')}</th>
                      <th className="py-2 pe-3 font-medium">{t('invoices.fields.type')}</th>
                      <th className="py-2 pe-3 font-medium text-end">{t('invoices.fields.quantity')}</th>
                      <th className="py-2 pe-3 font-medium text-end">{t('invoices.fields.unitPrice')}</th>
                      <th className="py-2 font-medium text-end">{t('invoices.fields.lineTotal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-2.5 pe-3">{line.description}</td>
                        <td className="py-2.5 pe-3 text-foreground-muted">{t(`invoices.lineTypes.${line.type}`)}</td>
                        <td className="numeric py-2.5 pe-3 text-end">{line.quantity}</td>
                        <td className="numeric py-2.5 pe-3 text-end">{formatCurrency(line.unitPrice, 'EGP', locale)}</td>
                        <td className="numeric py-2.5 text-end font-medium">{formatCurrency(line.lineTotal, 'EGP', locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader title={t('invoices.paymentsSection')} />
              {payments.length === 0 ? (
                <p className="px-2 text-sm text-foreground-subtle">{t('invoices.noPayments')}</p>
              ) : (
                <ul className="space-y-3 px-2">
                  {payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">
                          {t(`invoices.methods.${p.method}`)}
                          {p.reference ? ` · ${p.reference}` : ''}
                        </p>
                        <p className="text-xs text-foreground-subtle">
                          {formatDate(p.paidAt, locale)}
                          {p.recordedByName ? ` · ${p.recordedByName}` : ''}
                        </p>
                      </div>
                      <p className="numeric text-sm font-semibold text-success">{formatCurrency(p.amount, 'EGP', locale)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader title={t('invoices.summarySection')} />
              <dl className="space-y-2 px-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-foreground-subtle">{t('invoices.subtotal')}</dt>
                  <dd className="numeric">{formatCurrency(invoice.subtotal, 'EGP', locale)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-foreground-subtle">{t('invoices.tax')}</dt>
                  <dd className="numeric">{formatCurrency(invoice.tax, 'EGP', locale)}</dd>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground-subtle">{t('invoices.discount')}</dt>
                    <dd className="numeric">−{formatCurrency(invoice.discount, 'EGP', locale)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-border pt-2">
                  <dt className="font-medium">{t('invoices.total')}</dt>
                  <dd className="numeric text-base font-bold">{formatCurrency(invoice.total, 'EGP', locale)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-foreground-subtle">{t('invoices.amountPaid')}</dt>
                  <dd className="numeric text-success">{formatCurrency(invoice.amountPaid, 'EGP', locale)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-medium">{t('invoices.balance')}</dt>
                  <dd className="numeric text-base font-bold">{formatCurrency(invoice.balance, 'EGP', locale)}</dd>
                </div>
              </dl>
              {invoice.status === 'paid' && (
                <p className="mt-4 inline-flex items-center gap-2 px-2 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('invoices.paidInFull')}
                </p>
              )}
            </Card>

            {customer && (
              <Card>
                <CardHeader title={t('invoices.customerSection')} />
                <div className="space-y-1 px-2 text-sm">
                  <p className="font-medium">{customer.name}</p>
                  <p className="numeric text-xs text-foreground-subtle" dir="ltr">
                    {customer.customerCode} · {customer.phone}
                  </p>
                  <Button variant="outline" size="sm" fullWidth className="mt-2" onClick={() => navigate(`/app/customers/${customer.id}`)}>
                    {t('invoices.viewCustomer')}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={payOpen}
        onClose={() => !busy && setPayOpen(false)}
        title={t('invoices.recordPayment')}
        footer={
          <>
            <Button variant="outline" disabled={busy} onClick={() => setPayOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button isLoading={busy} onClick={() => void handlePay()}>
              {t('invoices.confirmPayment')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('invoices.fields.amount')} type="number" min={0.01} step="0.01" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select
            label={t('invoices.fields.method')}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`invoices.methods.${m}`) }))}
          />
          <Input label={t('invoices.fields.reference')} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('invoices.fields.referencePlaceholder')} />
          <Input label={t('invoices.fields.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>
    </PageTransition>
  );
}
