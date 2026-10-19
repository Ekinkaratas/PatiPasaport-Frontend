import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { addStockItem } from '@/api/endpoints/clinics';
import { isApiError } from '@/api/errors';
import { focusFirstInvalid } from '@/components/form/formUtils';
import { Select } from '@/components/form/Select';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageHeader } from '@/components/ui/PageHeader';
import { STOCK_CATEGORIES, STOCK_UNITS } from '@/domain/constants';
import { STOCK_AMOUNT_MAX, STOCK_NAME_MAX_LENGTH } from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { showFlash } from '@/lib/flash';
import { todayInBusinessTimeZone } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { useClinicAccount } from '../clinicContext';
import { PriceField } from './PriceField';
import { clinicKeys } from '../queries';
import {
  emptyStockForm,
  toAddStockRequest,
  validateStockForm,
  type StockFormField,
  type StockFormValues,
} from './stockModel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

const SERVER_FIELDS: Record<string, StockFormField> = {
  STOCK_NAME: 'name',
  CATEGORY: 'category',
  UNIT: 'unit',
  QUANTITY: 'quantity',
  CRITICAL_LEVEL: 'criticalLevel',
  EXPIRES_AT: 'expiresAt',
  PURCHASE_PRICE: 'purchasePrice',
  SALE_PRICE: 'salePrice',
};

export function StockCreatePage() {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  useDocumentTitle(t('stockForm.pageTitle'));
  const clinic = useClinicAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = todayInBusinessTimeZone();
  const [values, setValues] = useState<StockFormValues>(emptyStockForm);
  const [submitted, setSubmitted] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: () => addStockItem(clinic.id, toAddStockRequest(values)),
    onSuccess: async ({ item }) => {
      await queryClient.invalidateQueries({ queryKey: clinicKeys.all });
      showFlash('clinic:stockForm.created', { values: { name: item.name } });
      await navigate('/clinic/stock');
    },
  });

  const clientErrors = submitted ? validateStockForm(values, today) : {};
  const serverField =
    isApiError(mutation.error) && mutation.error.field
      ? SERVER_FIELDS[mutation.error.field]
      : undefined;
  const errorOf = (field: StockFormField) => {
    const code =
      clientErrors[field] ??
      (serverField === field && isApiError(mutation.error)
        ? mutation.error.code
        : undefined);
    return code ? translateError(code, i18n) : null;
  };

  const update = (field: StockFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (mutation.isError) mutation.reset();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateStockForm(values, today)).length > 0) {
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
    <div className="space-y-6">
      <PageHeader title={t('stockForm.title')} />
      <form
        noValidate
        onSubmit={onSubmit}
        className="space-y-6 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60 sm:p-8"
      >
        <Honeypot {...botGuard.honeypot} />
        {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} reveal />}
        {mutation.isError && !serverField && (
          <ErrorAlert error={mutation.error} reveal />
        )}
        <TextField
          label={t('stockForm.name')}
          name="name"
          autoComplete="off"
          maxLength={STOCK_NAME_MAX_LENGTH}
          placeholder={t('stockForm.namePlaceholder')}
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          error={errorOf('name')}
          required
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Select
            label={t('stockForm.category')}
            name="category"
            placeholder={t('stockForm.categoryPlaceholder')}
            value={values.category}
            onChange={(e) => update('category', e.target.value)}
            options={STOCK_CATEGORIES.map((code) => ({
              value: code,
              label: translate(`enums:stockCategory.${code}`),
            }))}
            error={errorOf('category')}
            required
          />
          <Select
            label={t('stockForm.unit')}
            name="unit"
            placeholder={t('stockForm.unitPlaceholder')}
            value={values.unit}
            onChange={(e) => update('unit', e.target.value)}
            options={STOCK_UNITS.map((code) => ({
              value: code,
              label: translate(`enums:stockUnit.${code}`),
            }))}
            error={errorOf('unit')}
            required
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label={t('stockForm.quantity')}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={0}
            max={STOCK_AMOUNT_MAX}
            step={1}
            value={values.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            error={errorOf('quantity')}
            required
          />
          <TextField
            label={t('stockForm.criticalLevel')}
            name="criticalLevel"
            type="number"
            inputMode="numeric"
            min={0}
            max={STOCK_AMOUNT_MAX}
            step={1}
            value={values.criticalLevel}
            onChange={(e) => update('criticalLevel', e.target.value)}
            error={errorOf('criticalLevel')}
            hint={t('stockForm.criticalHint')}
            required
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <PriceField
            label={t('stockForm.purchasePrice')}
            name="purchasePrice"
            value={values.purchasePrice}
            onChange={(e) => update('purchasePrice', e.target.value)}
            error={errorOf('purchasePrice')}
            hint={t('stockForm.purchasePriceHint')}
            required
          />
          <PriceField
            label={t('stockForm.salePrice')}
            name="salePrice"
            value={values.salePrice}
            onChange={(e) => update('salePrice', e.target.value)}
            error={errorOf('salePrice')}
            hint={t('stockForm.salePriceHint')}
            required
          />
        </div>
        <TextField
          label={t('stockForm.expiresAt')}
          name="expiresAt"
          type="date"
          min={today}
          value={values.expiresAt}
          onChange={(e) => update('expiresAt', e.target.value)}
          error={errorOf('expiresAt')}
          hint={t('stockForm.expiresHint')}
          className="sm:max-w-xs"
        />
        <div className="flex flex-col-reverse gap-3 border-t border-cream-300 pt-6 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => void navigate('/clinic/stock')}
            disabled={mutation.isPending}
          >
            {t('stockForm.cancel')}
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {t('stockForm.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
