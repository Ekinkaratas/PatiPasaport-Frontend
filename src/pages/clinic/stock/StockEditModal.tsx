import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { updateStockItem } from '@/api/endpoints/clinics';
import { isApiError } from '@/api/errors';
import type { StockItem } from '@/api/types';
import { focusFirstInvalid } from '@/components/form/formUtils';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { STOCK_AMOUNT_MAX, STOCK_NAME_MAX_LENGTH } from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { showFlash } from '@/lib/flash';
import { todayInBusinessTimeZone } from '@/lib/format';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { applyStockItemChange, clinicKeys } from '../queries';
import {
  hasPrices,
  stockEditFormFrom,
  toUpdateStockRequest,
  validateStockEdit,
  type StockEditField,
  type StockEditValues,
} from './stockModel';
import { PriceField } from './PriceField';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

const SERVER_FIELDS: Record<string, StockEditField> = {
  STOCK_NAME: 'name',
  QUANTITY: 'quantity',
  CRITICAL_LEVEL: 'criticalLevel',
  EXPIRES_AT: 'expiresAt',
  PURCHASE_PRICE: 'purchasePrice',
  SALE_PRICE: 'salePrice',
};

export function StockEditModal({
  clinicId,
  item,
  onClose,
}: {
  clinicId: string;
  item: StockItem;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const queryClient = useQueryClient();
  const formId = useId();
  const today = todayInBusinessTimeZone();
  const [values, setValues] = useState<StockEditValues>(() =>
    stockEditFormFrom(item, i18n.language),
  );
  const [submitted, setSubmitted] = useState(false);
  const [noChanges, setNoChanges] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      updateStockItem(clinicId, item.id, toUpdateStockRequest(values, item)),
    onSuccess: ({ item: updated }) => {
      void applyStockItemChange(queryClient, updated, 'updated');
      showFlash('clinic:stockEdit.done', { values: { name: updated.name } });
      onClose();
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: clinicKeys.stockAll });
      }
    },
  });

  const clientErrors = submitted ? validateStockEdit(values, item, today) : {};
  const serverField =
    isApiError(mutation.error) && mutation.error.field
      ? SERVER_FIELDS[mutation.error.field]
      : undefined;
  const errorOf = (field: StockEditField) => {
    const code =
      clientErrors[field] ??
      (serverField === field && isApiError(mutation.error)
        ? mutation.error.code
        : undefined);
    return code ? translateError(code, i18n) : null;
  };

  const update = (field: StockEditField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setNoChanges(false);
    if (mutation.isError) mutation.reset();
  };

  const close = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateStockEdit(values, item, today)).length > 0) {
      focusFirstInvalid(event.currentTarget);
      return;
    }
    if (Object.keys(toUpdateStockRequest(values, item)).length === 0) {
      setNoChanges(true);
      return;
    }
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    mutation.mutate();
  };

  return (
    <Modal
      open
      onClose={close}
      title={t('stockEdit.title')}
      className="max-w-xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t('stockEdit.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            {t('stockEdit.submit')}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={onSubmit}
        className="space-y-5 overflow-y-auto px-6 py-5"
      >
        <Honeypot {...botGuard.honeypot} />
        {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} />}
        {mutation.isError && !serverField && (
          <ErrorAlert error={mutation.error} />
        )}
        {noChanges && (
          <p
            role="status"
            className="rounded-xl bg-accent-tint px-4 py-3 text-sm font-semibold text-accent-strong"
          >
            {t('stockEdit.noChanges')}
          </p>
        )}
        <div className="rounded-xl bg-bg px-4 py-3 text-sm">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-fg-muted">{t('stockEdit.category')}</dt>
              <dd className="font-bold text-fg">
                {translate(`enums:stockCategory.${item.category}`)}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">{t('stockEdit.unit')}</dt>
              <dd className="font-bold text-fg">
                {translate(`enums:stockUnit.${item.unit}`)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-fg-muted">{t('stockEdit.fixedFields')}</p>
        </div>
        <TextField
          label={t('stockEdit.name')}
          name="name"
          autoComplete="off"
          maxLength={STOCK_NAME_MAX_LENGTH}
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          error={errorOf('name')}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={t('stockEdit.quantity')}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={0}
            max={STOCK_AMOUNT_MAX}
            step={1}
            value={values.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            error={errorOf('quantity')}
            hint={t('stockEdit.quantityHint')}
            required
          />
          <TextField
            label={t('stockEdit.criticalLevel')}
            name="criticalLevel"
            type="number"
            inputMode="numeric"
            min={0}
            max={STOCK_AMOUNT_MAX}
            step={1}
            value={values.criticalLevel}
            onChange={(e) => update('criticalLevel', e.target.value)}
            error={errorOf('criticalLevel')}
            hint={t('stockEdit.criticalHint')}
            required
          />
        </div>
        <div>
          <TextField
            label={t('stockEdit.expiresAt')}
            name="expiresAt"
            type="date"
            min={today}
            value={values.expiresAt}
            onChange={(e) => update('expiresAt', e.target.value)}
            error={errorOf('expiresAt')}
            hint={t('stockEdit.expiresHint')}
            className="sm:max-w-xs"
          />
          {values.expiresAt && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={(event) => {
                event.currentTarget.parentElement
                  ?.querySelector<HTMLInputElement>('input[name="expiresAt"]')
                  ?.focus();
                update('expiresAt', '');
              }}
            >
              {t('stockEdit.removeExpiry')}
            </Button>
          )}
        </div>
        {!hasPrices(item) && (
          <p className="rounded-xl bg-accent-tint px-4 py-3 text-sm font-semibold text-accent-strong">
            {t('stockEdit.missingPrices')}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <PriceField
            label={t('stockEdit.purchasePrice')}
            name="purchasePrice"
            value={values.purchasePrice}
            onChange={(e) => update('purchasePrice', e.target.value)}
            error={errorOf('purchasePrice')}
          />
          <PriceField
            label={t('stockEdit.salePrice')}
            name="salePrice"
            value={values.salePrice}
            onChange={(e) => update('salePrice', e.target.value)}
            error={errorOf('salePrice')}
          />
        </div>
        <p className="text-sm text-fg-muted">{t('stockEdit.priceHint')}</p>
      </form>
    </Modal>
  );
}
