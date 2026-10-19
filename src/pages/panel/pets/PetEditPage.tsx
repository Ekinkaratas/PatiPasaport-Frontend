import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { updatePet } from '@/api/endpoints/pets';
import type { Pet } from '@/api/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { showFlash } from '@/lib/flash';
import { todayInBusinessTimeZone } from '@/lib/format';
import { isUuidV4 } from '@/lib/ids';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import {
  petToFormValues,
  toUpdateRequest,
  type PetFormValues,
} from './petFormModel';
import { PetForm } from './PetForm';
import { PetNotFound } from './PetNotFound';
import { isPetNotFound, usePet, useStorePet } from './queries';

function EditForm({ pet }: { pet: Pet }) {
  const { t } = useTranslation('pets');
  const navigate = useNavigate();
  const storePet = useStorePet();
  const [notice, setNotice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: ReturnType<typeof toUpdateRequest>) =>
      updatePet(pet.id, request),
    onSuccess: async ({ pet: updated }) => {
      storePet(updated);
      showFlash('pets:form.saved');
      await navigate(`/panel/pets/${updated.id}`, { replace: true });
    },
  });

  const submit = (values: PetFormValues, today: string) => {
    const request = toUpdateRequest(values, pet, today);
    if (Object.keys(request).length === 0) {
      setNotice(t('form.noChanges'));
      return;
    }
    setNotice(null);
    mutation.mutate(request);
  };

  return (
    <PetForm
      mode="edit"
      original={pet}
      initialValues={petToFormValues(pet, todayInBusinessTimeZone())}
      submitting={mutation.isPending}
      submitError={mutation.error}
      notice={notice}
      submitLabel={t('form.submitEdit')}
      onSubmit={submit}
      onCancel={() => void navigate(`/panel/pets/${pet.id}`)}
    />
  );
}

export function PetEditPage() {
  const { t } = useTranslation('pets');
  useDocumentTitle(t('form.editPageTitle'));
  const { petId = '' } = useParams();
  const pet = usePet(petId);

  if (!isUuidV4(petId)) return <PetNotFound />;
  if (pet.isError && isPetNotFound(pet.error)) return <PetNotFound />;

  return (
    <div className="space-y-6">
      {pet.data && (
        <PageHeader title={t('form.editTitle', { name: pet.data.name })} />
      )}
      {pet.isError && <ErrorAlert error={pet.error} />}
      {pet.isPending && <LoadingBlock />}
      {pet.data && !pet.isPlaceholderData && (
        <EditForm key={pet.data.updatedAt} pet={pet.data} />
      )}
      {pet.isPlaceholderData && <LoadingBlock />}
    </div>
  );
}
