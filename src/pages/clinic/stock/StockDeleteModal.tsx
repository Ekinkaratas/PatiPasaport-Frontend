import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { deleteStockItem } from '@/api/endpoints/clinics';
import { isApiError } from '@/api/errors';
import type { StockItem } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { showFlash } from '@/lib/flash';
import { applyStockItemChange, clinicKeys } from '../queries';

export function StockDeleteModal({
  clinicId,
  item,
  onClose,
}: {
  clinicId: string;
  item: StockItem;
  onClose: () => void;
}) {
  const { t } = useTranslation('clinic');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteStockItem(clinicId, item.id),
    onSuccess: () => {
      void applyStockItemChange(queryClient, item, 'deleted');
      showFlash('clinic:stockDelete.done', { values: { name: item.name } });
      onClose();
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: clinicKeys.stockAll });
      }
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      title={t('stockDelete.title')}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t('stockDelete.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t('stockDelete.submit')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        <p className="text-fg">{t('stockDelete.body', { name: item.name })}</p>
      </div>
    </Modal>
  );
}
