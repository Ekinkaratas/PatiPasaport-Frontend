import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createStockSale } from '@/api/endpoints/clinics';
import { isApiError } from '@/api/errors';
import type { StockItem } from '@/api/types';
import { focusFirstInvalid } from '@/components/form/formUtils';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { STOCK_AMOUNT_MAX } from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { cn } from '@/lib/cn';
import { showFlash } from '@/lib/flash';
import { formatMoney } from '@/lib/format';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { applyStockItemChange, clinicKeys } from '../queries';
import {
  saleFormFrom,
  salePreview,
  toSaleRequest,
  validateSaleForm,
  type SaleFormField,
  type SaleFormValues,
} from '../sales/salesModel';
import { PriceField } from './PriceField';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

const SERVER_FIELDS: Record<string, SaleFormField> = {
  QUANTITY: 'quantity',
  UNIT_PRICE: 'unitPrice',
};

export function StockSaleModal({
  clinicId,
  item,
  initialQuantity,
  onClose,
}: {
  clinicId: string;
  item: StockItem;
  initialQuantity?: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const queryClient = useQueryClient();
  const formId = useId();
  const [values, setValues] = useState<SaleFormValues>(() =>
    saleFormFrom(item, i18n.language, initialQuantity),
  );
  const [submitted, setSubmitted] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);
  const unit = translate(`enums:stockUnit.${item.unit}`);
  const money = (kurus: number) => formatMoney(kurus, i18n.language);

  const mutation = useMutation({
    mutationFn: () => createStockSale(clinicId, item.id, toSaleRequest(values)),
    onSuccess: ({ sale, item: updated }) => {
      if (updated) void applyStockItemChange(queryClient, updated, 'updated');
      void queryClient.invalidateQueries({ queryKey: clinicKeys.salesAll });
      showFlash('clinic:stockSale.done', {
        values: {
          name: sale.itemName,
          quantity: sale.quantity,
          unit,
          total: money(sale.totalSale),
        },
      });
      onClose();
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: clinicKeys.stockAll });
      }
    },
  });

  const clientErrors = submitted ? validateSaleForm(values, item) : {};
  const serverField =
    isApiError(mutation.error) && mutation.error.field
      ? SERVER_FIELDS[mutation.error.field]
      : undefined;
  const errorOf = (field: SaleFormField) => {
    const code =
      clientErrors[field] ??
      (serverField === field && isApiError(mutation.error)
        ? mutation.error.code
        : undefined);
    return code ? translateError(code, i18n) : null;
  };
  const preview = salePreview(values, item);

  const update = (field: SaleFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (mutation.isError) mutation.reset();
  };

  const close = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateSaleForm(values, item)).length > 0) {
      focusFirstInvalid(event.currentTarget);
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
      title={t('stockSale.title')}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t('stockSale.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            {t('stockSale.submit')}
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
        <div className="rounded-xl bg-bg px-4 py-3">
          <p className="wrap-break-word font-extrabold text-fg">{item.name}</p>
          <p className="mt-1 text-sm text-fg-muted">
            {t('stockSale.available')}:{' '}
            <span className="font-bold text-fg">
              {item.quantity} {unit}
            </span>
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={t('stockSale.quantity')}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.min(item.quantity, STOCK_AMOUNT_MAX)}
            step={1}
            autoComplete="off"
            value={values.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            error={errorOf('quantity')}
            required
          />
          <PriceField
            label={t('stockSale.unitPrice')}
            name="unitPrice"
            value={values.unitPrice}
            onChange={(e) => update('unitPrice', e.target.value)}
            error={errorOf('unitPrice')}
            hint={t('stockSale.unitPriceHint')}
          />
        </div>
        <dl
          aria-live="polite"
          className="grid grid-cols-3 gap-3 rounded-xl bg-bg px-4 py-3 text-sm"
        >
          <div>
            <dt className="text-fg-muted">{t('stockSale.total')}</dt>
            <dd className="font-extrabold text-fg tabular-nums">
              {preview ? money(preview.total) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t('stockSale.cost')}</dt>
            <dd className="font-extrabold text-fg tabular-nums">
              {preview ? money(preview.cost) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t('stockSale.profit')}</dt>
            <dd
              className={cn(
                'font-extrabold tabular-nums',
                preview && preview.profit < 0 ? 'text-danger' : 'text-ok',
              )}
            >
              {preview ? money(preview.profit) : '—'}
            </dd>
          </div>
        </dl>
      </form>
    </Modal>
  );
}
