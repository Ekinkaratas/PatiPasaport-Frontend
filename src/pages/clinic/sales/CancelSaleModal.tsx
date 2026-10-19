import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cancelStockSale } from '@/api/endpoints/clinics';
import { isApiError } from '@/api/errors';
import type { StockSale } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { showFlash } from '@/lib/flash';
import { formatMoney } from '@/lib/format';
import { clinicKeys } from '../queries';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

export function CancelSaleModal({
  clinicId,
  sale,
  onClose,
}: {
  clinicId: string;
  sale: StockSale;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const queryClient = useQueryClient();
  const unit = translate(`enums:stockUnit.${sale.unit}`);

  const mutation = useMutation({
    mutationFn: () => cancelStockSale(clinicId, sale.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clinicKeys.salesAll });
      void queryClient.invalidateQueries({ queryKey: clinicKeys.stockAll });
      showFlash('clinic:saleCancel.done', { values: { name: sale.itemName } });
      onClose();
    },
    onError: (error) => {
      if (isApiError(error) && (error.status === 404 || error.status === 409)) {
        void queryClient.invalidateQueries({ queryKey: clinicKeys.salesAll });
      }
    },
  });

  const conflict = isApiError(mutation.error) && mutation.error.status === 409;

  const close = () => {
    if (mutation.isPending) return;
    onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      title={t('saleCancel.title')}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t('saleCancel.back')}
          </Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            disabled={conflict}
            onClick={() => mutation.mutate()}
          >
            {t('saleCancel.submit')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        {mutation.isError &&
          (conflict ? (
            <p
              role="alert"
              className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700 ring-1 ring-coral-100"
            >
              {t('saleCancel.conflict')}
            </p>
          ) : (
            <ErrorAlert error={mutation.error} />
          ))}
        <div className="rounded-2xl bg-cream-200 px-4 py-3">
          <p className="truncate font-extrabold text-cocoa-900">
            {sale.itemName}
          </p>
          <p className="mt-1 text-sm text-cocoa-600">
            {sale.quantity} {unit} ·{' '}
            {formatMoney(sale.totalSale, i18n.language)}
          </p>
        </div>
        <p className="text-cocoa-700">
          {sale.stockItemId
            ? t('saleCancel.restock', { quantity: sale.quantity, unit })
            : t('saleCancel.noRestock')}
        </p>
        <p className="text-sm text-cocoa-500">{t('saleCancel.note')}</p>
      </div>
    </Modal>
  );
}
