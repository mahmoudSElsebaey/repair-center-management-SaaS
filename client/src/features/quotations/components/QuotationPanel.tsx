import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/feedback/Toast';
import { quotationsApi } from '@/features/quotations/api';
import type { Quotation } from '@/features/quotations/types';
import type { QuotationLineType } from '@/types/domain';
import { QUOTATION_LINE_TYPES } from '@/types/domain';
import { activeLocale } from '@/lib/i18nText';
import { formatCurrency, getErrorMessage } from '@/lib/utils';

interface LineDraft {
  type: QuotationLineType;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface QuotationPanelProps {
  repairId: string;
  ticketStatus: string;
  onTicketChanged?: () => void;
  canEdit: boolean;
  canDecide: boolean;
}

function emptyLine(): LineDraft {
  return { type: 'labor', description: '', quantity: '1', unitPrice: '0' };
}

function lineTotal(line: LineDraft): number {
  const q = Number(line.quantity);
  const p = Number(line.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p)) return 0;
  return Math.round(q * p * 100) / 100;
}

/** Quotation builder + customer decision panel for one repair ticket. */
export function QuotationPanel({
  repairId,
  ticketStatus,
  onTicketChanged,
  canEdit,
  canDecide,
}: QuotationPanelProps) {
  const { t } = useTranslation();
  const notify = useToast();
  const locale = activeLocale();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadQuotation = async () => {
      setLoading(true);
      try {
        const data = await quotationsApi.get(repairId);
        if (cancelled) return;

        setQuotation(data.quotation);
        if (data.quotation) {
          setLines(
            data.quotation.lines.map((l) => ({
              type: l.type,
              description: l.description,
              quantity: String(l.quantity),
              unitPrice: String(l.unitPrice),
            }))
          );
          setTax(String(data.quotation.tax ?? 0));
          setNotes(data.quotation.notes ?? '');
        } else {
          setLines([emptyLine()]);
          setTax('0');
          setNotes('');
        }
      } catch (error) {
        if (!cancelled) {
          notify.error(getErrorMessage(error, t('states.errorBody')));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadQuotation();

    return () => {
      cancelled = true;
    };
  }, [repairId]);

  const subtotal = useMemo(
    () => Math.round(lines.reduce((sum, l) => sum + lineTotal(l), 0) * 100) / 100,
    [lines]
  );
  const taxAmount = Number(tax) || 0;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const locked =
    quotation?.status === 'approved' || quotation?.status === 'rejected' || !canEdit;

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const payloadLines = () =>
    lines.map((l) => ({
      type: l.type,
      description: l.description.trim(),
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    }));

  const handleSave = async () => {
    setBusy(true);
    try {
      const result = await quotationsApi.save(repairId, {
        lines: payloadLines(),
        tax: taxAmount,
        notes: notes.trim() || null,
      });
      setQuotation(result.quotation);
      notify.success(t('quotations.savedToast'));
      onTicketChanged?.();
    } catch (error) {
      notify.error(getErrorMessage(error, t('states.errorBody')));
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    setBusy(true);
    try {
      await quotationsApi.save(repairId, {
        lines: payloadLines(),
        tax: taxAmount,
        notes: notes.trim() || null,
      });
      const result = await quotationsApi.send(repairId);
      setQuotation(result.quotation);
      notify.success(t('quotations.sentToast'));
      onTicketChanged?.();
    } catch (error) {
      notify.error(getErrorMessage(error, t('states.errorBody')));
    } finally {
      setBusy(false);
    }
  };

  const handleDecide = async (approved: boolean) => {
    if (!approved && !rejectionReason.trim()) {
      notify.error(t('quotations.validation.rejectionRequired'));
      return;
    }
    setBusy(true);
    try {
      const result = await quotationsApi.decide(repairId, {
        approved,
        rejectionReason: approved ? null : rejectionReason.trim(),
      });
      setQuotation(result.quotation);
      notify.success(approved ? t('quotations.approvedToast') : t('quotations.rejectedToast'));
      onTicketChanged?.();
    } catch (error) {
      notify.error(getErrorMessage(error, t('states.errorBody')));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title={t('quotations.title')} />
        <p className="px-2 text-sm text-foreground-subtle">{t('common.loading')}</p>
      </Card>
    );
  }

  const statusLabel = quotation
    ? t(`quotations.status.${quotation.status}`)
    : t('quotations.status.none');

  return (
    <Card>
      <CardHeader
        title={t('quotations.title')}
        description={quotation ? `${quotation.code} · ${statusLabel}` : t('quotations.subtitle')}
      />

      <div className="space-y-4 px-2 pb-2">
        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[7rem_1fr_5rem_6rem_auto]"
          >
            <label className="text-xs text-foreground-subtle">
              {t('quotations.fields.type')}
              <select
                className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                value={line.type}
                disabled={locked || busy}
                onChange={(e) => updateLine(index, { type: e.target.value as QuotationLineType })}
              >
                {QUOTATION_LINE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`quotations.lineTypes.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            <Input label={t('quotations.fields.description')} value={line.description} disabled={locked || busy} onChange={(e) => updateLine(index, { description: e.target.value })} />
            <Input label={t('quotations.fields.quantity')} type="number" min={0.01} step="0.01" dir="ltr" value={line.quantity} disabled={locked || busy} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
            <Input label={t('quotations.fields.unitPrice')} type="number" min={0} step="0.01" dir="ltr" value={line.unitPrice} disabled={locked || busy} onChange={(e) => updateLine(index, { unitPrice: e.target.value })} />
            <div className="flex items-end gap-2">
              <p className="numeric text-sm font-medium">{formatCurrency(lineTotal(line), 'EGP', locale)}</p>
              {!locked && lines.length > 1 && (
                <Button type="button" variant="ghost" size="sm" aria-label={t('common.delete')} onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {!locked && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
            <Plus className="me-1 h-4 w-4" />
            {t('quotations.addLine')}
          </Button>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('quotations.fields.tax')} type="number" min={0} step="0.01" dir="ltr" value={tax} disabled={locked || busy} onChange={(e) => setTax(e.target.value)} />
          <Input label={t('quotations.fields.notes')} value={notes} disabled={locked || busy} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <dl className="grid gap-2 sm:grid-cols-3">
          <div><dt className="text-xs text-foreground-subtle">{t('quotations.subtotal')}</dt><dd className="numeric text-base font-semibold">{formatCurrency(subtotal, 'EGP', locale)}</dd></div>
          <div><dt className="text-xs text-foreground-subtle">{t('quotations.tax')}</dt><dd className="numeric text-base font-semibold">{formatCurrency(taxAmount, 'EGP', locale)}</dd></div>
          <div><dt className="text-xs text-foreground-subtle">{t('quotations.total')}</dt><dd className="numeric text-lg font-bold text-foreground">{formatCurrency(total, 'EGP', locale)}</dd></div>
        </dl>

        {!locked && canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleSave()}>{t('quotations.saveDraft')}</Button>
            <Button type="button" disabled={busy || ticketStatus === 'received'} onClick={() => void handleSend()}>
              <Send className="me-1 h-4 w-4" />
              {t('quotations.sendForApproval')}
            </Button>
          </div>
        )}

        {canDecide && quotation && (quotation.status === 'sent' || ticketStatus === 'waiting_customer') && quotation.status !== 'approved' && quotation.status !== 'rejected' && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">{t('quotations.recordDecision')}</p>
            <Input label={t('quotations.fields.rejectionReason')} value={rejectionReason} disabled={busy} onChange={(e) => setRejectionReason(e.target.value)} placeholder={t('quotations.rejectionPlaceholder')} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void handleDecide(true)}><CheckCircle2 className="me-1 h-4 w-4" />{t('quotations.approve')}</Button>
              <Button type="button" variant="danger" disabled={busy} onClick={() => void handleDecide(false)}><XCircle className="me-1 h-4 w-4" />{t('quotations.reject')}</Button>
            </div>
          </div>
        )}

        {quotation?.status === 'approved' && <p className="inline-flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />{t('quotations.approvedToast')}</p>}
        {quotation?.status === 'rejected' && <p className="text-sm font-medium text-danger">{t('quotations.rejectedToast')}{quotation.rejectionReason ? ` — ${quotation.rejectionReason}` : ''}</p>}
      </div>
    </Card>
  );
}
