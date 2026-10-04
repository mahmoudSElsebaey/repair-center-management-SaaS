import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/forms/Fields';
import { useToast } from '@/components/feedback/Toast';
import { inventoryApi } from '../api';
import { stockMovementFormSchema, type StockMovementFormValues } from '../schemas';
import type { InventoryItem } from '../types';
import { INVENTORY_TRANSACTION_TYPES } from '@/types/domain';
import { getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: InventoryItem | null;
}

const MOVEMENT_TYPES = INVENTORY_TRANSACTION_TYPES.filter((t) => t !== 'transfer');

export function StockMovementDialog({ open, onClose, onSaved, item }: Props) {
  const { t } = useTranslation();
  const notify = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<StockMovementFormValues>({
    resolver: zodResolver(stockMovementFormSchema),
    defaultValues: {
      type: 'purchase',
      quantity: 1,
      direction: 'in',
      unitCost: undefined,
      notes: '',
    },
  });

  const selectedType = form.watch('type');

  useEffect(() => {
    if (!open || !item) return;
    form.reset({
      type: 'purchase',
      quantity: 1,
      direction: 'in',
      unitCost: item.unitCost,
      notes: '',
    });
  }, [open, item, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!item) return;
    setSubmitting(true);
    try {
      await inventoryApi.recordMovement(item.id, {
        type: values.type,
        quantity: values.quantity,
        direction: values.type === 'adjustment' ? values.direction : undefined,
        unitCost: values.unitCost,
        notes: values.notes || undefined,
      });
      notify.success(t('inventory.movementToast'));
      onSaved();
      onClose();
    } catch (caught) {
      notify.error(t('states.errorTitle'), getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setSubmitting(false);
    }
  });

  const fieldError = (key?: string) => (key ? t(key) : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('inventory.recordMovement')}
      description={item ? `${item.sku} · ${item.name}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} isLoading={submitting}>
            {t('inventory.recordMovement')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Select
          label={t('inventory.fields.movementType')}
          error={fieldError(form.formState.errors.type?.message)}
          options={MOVEMENT_TYPES.map((type) => ({
            value: type,
            label: t(`inventory.transactionTypes.${type}`),
          }))}
          {...form.register('type')}
        />

        <Input
          label={t('inventory.fields.quantity')}
          type="number"
          dir="ltr"
          error={fieldError(form.formState.errors.quantity?.message)}
          {...form.register('quantity')}
        />

        {selectedType === 'adjustment' && (
          <Select
            label={t('inventory.fields.direction')}
            error={fieldError(form.formState.errors.direction?.message)}
            options={[
              { value: 'in', label: t('inventory.direction.in') },
              { value: 'out', label: t('inventory.direction.out') },
            ]}
            {...form.register('direction')}
          />
        )}

        {(selectedType === 'purchase' || selectedType === 'return') && (
          <Input
            label={t('inventory.fields.unitCost')}
            type="number"
            dir="ltr"
            error={fieldError(form.formState.errors.unitCost?.message)}
            {...form.register('unitCost')}
          />
        )}

        <Input
          label={t('inventory.fields.notes')}
          error={fieldError(form.formState.errors.notes?.message)}
          {...form.register('notes')}
        />

        {item && (
          <p className="text-xs text-foreground-subtle">
            {t('inventory.onHandNow')}:{' '}
            <span className="numeric font-medium text-foreground" dir="ltr">
              {item.quantityOnHand} {item.unit}
            </span>
          </p>
        )}
      </form>
    </Modal>
  );
}
