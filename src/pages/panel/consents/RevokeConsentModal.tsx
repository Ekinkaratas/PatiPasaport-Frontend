import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { revokeConsent } from '@/api/endpoints/consents';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { showFlash } from '@/lib/flash';
import { consentsQueryKey } from './queries';

export interface RevokeTarget {
  consentId: string;
  clinicName: string;
  petName: string;
}

export function RevokeConsentModal({
  target,
  onClose,
}: {
  target: RevokeTarget | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('consents');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: revokeConsent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consentsQueryKey });
      showFlash('consents:revoke.done');
      onClose();
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    mutation.reset();
    onClose();
  };

  return (
    <Modal
      open={target !== null}
      onClose={close}
      title={t('revoke.title')}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t('revoke.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => target && mutation.mutate(target.consentId)}
          >
            {t('revoke.confirm')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-6 py-5">
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        {target && (
          <p className="text-cocoa-700">
            {t('revoke.body', {
              clinic: target.clinicName,
              pet: target.petName,
            })}
          </p>
        )}
      </div>
    </Modal>
  );
}
