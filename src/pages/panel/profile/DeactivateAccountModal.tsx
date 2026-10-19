import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { deactivateMe } from '@/api/endpoints/users';
import { endSession } from '@/auth/session';
import { Checkbox } from '@/components/form/Checkbox';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { showFlash } from '@/lib/flash';

export function DeactivateAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('profile');
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: deactivateMe,
    onSuccess: async () => {
      showFlash('profile:flash.accountClosed', { tone: 'info' });
      await endSession();
      queryClient.clear();
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    setConfirmed(false);
    mutation.reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('deactivate.title')}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t('deactivate.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={!confirmed}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t('deactivate.submit')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        <ul className="list-disc space-y-2 pl-5 text-cocoa-700 marker:text-coral-500">
          <li>{t('deactivate.point1')}</li>
          <li>{t('deactivate.point2')}</li>
          <li>{t('deactivate.point3')}</li>
        </ul>
        <Checkbox
          label={t('deactivate.confirm')}
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
      </div>
    </Modal>
  );
}
