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
import { inventoryItemFormSchema, type InventoryItemFormValues } from '../schemas';
import type { InventoryItem } from '../types';
import { INVENTORY_CATEGORIES } from '@/types/domain';
import { getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: InventoryItem | null;
}

export function InventoryFormDialog({ open, onClose, onSaved, item }: Props) {
  const { t } = useTranslation();
  const notify = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(item);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      name: '',
      category: 'other',
      brand: '',
      unit: 'pcs',
      quantityOnHand: 0,
      minQuantity: 2,
      unitCost: 0,
      sellPrice: 0,
      location: '',
      supplier: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (item) {
      form.reset({
        name: item.name,
        category: item.category,
        brand: item.brand ?? '',
        unit: item.unit,
        quantityOnHand: item.quantityOnHand,
        minQuantity: item.minQuantity,
        unitCost: item.unitCost,
        sellPrice: item.sellPrice,
        location: item.location ?? '',
        supplier: item.supplier ?? '',
        notes: item.notes ?? '',
      });
    } else {
      form.reset({
        name: '',
        category: 'other',
        brand: '',
        unit: 'pcs',
        quantityOnHand: 0,
        minQuantity: 2,
        unitCost: 0,
        sellPrice: 0,
        location: '',
        supplier: '',
        notes: '',
      });
    }
  }, [open, item, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (isEdit && item) {
        await inventoryApi.update(item.id, {
          name: values.name,
          category: values.category,
          brand: values.brand || undefined,
          unit: values.unit,
          minQuantity: values.minQuantity,
          unitCost: values.unitCost,
          sellPrice: values.sellPrice,
          location: values.location || undefined,
          supplier: values.supplier || undefined,
          notes: values.notes || undefined,
        });
        notify.success(t('inventory.updatedToast'));
      } else {
        await inventoryApi.create({
          name: values.name,
          category: values.category,
          brand: values.brand || undefined,
          unit: values.unit,
          quantityOnHand: values.quantityOnHand,
          minQuantity: values.minQuantity,
          unitCost: values.unitCost,
          sellPrice: values.sellPrice,
          location: values.location || undefined,
          supplier: values.supplier || undefined,
          notes: values.notes || undefined,
        });
        notify.success(t('inventory.createdToast'));
      }
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
      size="md"
      title={isEdit ? t('inventory.edit') : t('inventory.add')}
      description={t('inventory.formHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} isLoading={submitting}>
            {isEdit ? t('common.save') : t('inventory.add')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          label={t('inventory.fields.name')}
          error={fieldError(form.formState.errors.name?.message)}
          {...form.register('name')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('inventory.fields.category')}
            error={fieldError(form.formState.errors.category?.message)}
            options={INVENTORY_CATEGORIES.map((c) => ({
              value: c,
              label: t(`inventory.categories.${c}`),
            }))}
            {...form.register('category')}
          />
          <Input
            label={t('inventory.fields.brand')}
            error={fieldError(form.formState.errors.brand?.message)}
            {...form.register('brand')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {!isEdit && (
            <Input
              label={t('inventory.fields.quantity')}
              type="number"
              dir="ltr"
              error={fieldError(form.formState.errors.quantityOnHand?.message)}
              {...form.register('quantityOnHand')}
            />
          )}
          <Input
            label={t('inventory.fields.minQuantity')}
            type="number"
            dir="ltr"
            error={fieldError(form.formState.errors.minQuantity?.message)}
            {...form.register('minQuantity')}
          />
          <Input
            label={t('inventory.fields.unit')}
            error={fieldError(form.formState.errors.unit?.message)}
            {...form.register('unit')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('inventory.fields.unitCost')}
            type="number"
            dir="ltr"
            error={fieldError(form.formState.errors.unitCost?.message)}
            {...form.register('unitCost')}
          />
          <Input
            label={t('inventory.fields.sellPrice')}
            type="number"
            dir="ltr"
            error={fieldError(form.formState.errors.sellPrice?.message)}
            {...form.register('sellPrice')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('inventory.fields.location')}
            error={fieldError(form.formState.errors.location?.message)}
            {...form.register('location')}
          />
          <Input
            label={t('inventory.fields.supplier')}
            error={fieldError(form.formState.errors.supplier?.message)}
            {...form.register('supplier')}
          />
        </div>

        <Input
          label={t('inventory.fields.notes')}
          error={fieldError(form.formState.errors.notes?.message)}
          {...form.register('notes')}
        />
      </form>
    </Modal>
  );
}
