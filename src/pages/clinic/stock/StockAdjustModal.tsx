import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adjustStockItem } from '@/api/endpoints/clinics';
import { isApiError } from '@/api/errors';
import type { StockItem } from '@/api/types';
import { RadioGroup } from '@/components/form/RadioGroup';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { STOCK_AMOUNT_MAX } from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { showFlash } from '@/lib/flash';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { applyStockItemChange, clinicKeys } from '../queries';
import {
  toStockDelta,
  validateStockAdjust,
  type AdjustDirection,
} from './stockModel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

const AMOUNT_FIELDS = new Set(['DELTA', 'QUANTITY']);

export function StockAdjustModal({
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
  const [direction, setDirection] = useState<AdjustDirection>('remove');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);
  const unit = translate(`enums:stockUnit.${item.unit}`);

  const mutation = useMutation({
    mutationFn: (delta: number) => adjustStockItem(clinicId, item.id, delta),
    onSuccess: ({ item: updated }) => {
      void applyStockItemChange(queryClient, updated, 'updated');
      showFlash('clinic:stockAdjust.done', {
        values: { name: updated.name, quantity: updated.quantity, unit },
      });
      onClose();
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: clinicKeys.stockAll });
      }
    },
  });

  const clientCode = validateStockAdjust(direction, amount, item);
  const serverAmountError =
    isApiError(mutation.error) &&
    mutation.error.field !== undefined &&
    AMOUNT_FIELDS.has(mutation.error.field);
  const amountError =
    submitted && clientCode
      ? translateError(clientCode, i18n)
      : serverAmountError
        ? translateError(mutation.error, i18n)
        : null;
  const preview = clientCode
    ? null
    : item.quantity + toStockDelta(direction, amount);

  const close = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (clientCode) {
      event.currentTarget
        .querySelector<HTMLInputElement>('[name="amount"]')
        ?.focus();
      return;
    }
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    mutation.mutate(toStockDelta(direction, amount));
  };

  return (
    <Modal
      open
      onClose={close}
      title={t('stockAdjust.title')}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t('stockAdjust.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            {t('stockAdjust.submit')}
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
        {mutation.isError && !serverAmountError && (
          <ErrorAlert error={mutation.error} />
        )}
        <div className="rounded-xl bg-bg px-4 py-3">
          <p className="wrap-break-word font-extrabold text-fg">{item.name}</p>
          <p className="mt-1 text-sm text-fg-muted">
            {t('stockAdjust.current')}:{' '}
            <span className="font-bold text-fg">
              {item.quantity} {unit}
            </span>
          </p>
        </div>
        <RadioGroup
          label={t('stockAdjust.direction')}
          name="direction"
          value={direction}
          onChange={(value) => {
            setDirection(value as AdjustDirection);
            if (mutation.isError) mutation.reset();
          }}
          options={[
            { value: 'remove', label: t('stockAdjust.remove') },
            { value: 'add', label: t('stockAdjust.add') },
          ]}
        />
        <TextField
          label={t('stockAdjust.amount')}
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={STOCK_AMOUNT_MAX}
          step={1}
          autoComplete="off"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (mutation.isError) mutation.reset();
          }}
          error={amountError}
          hint={t('stockAdjust.amountHint')}
          required
        />
        <p className="text-sm text-fg-muted" aria-live="polite">
          {preview !== null && (
            <>
              {t('stockAdjust.result')}:{' '}
              <span className="font-bold text-fg">
                {preview} {unit}
              </span>
            </>
          )}
        </p>
      </form>
    </Modal>
  );
}
