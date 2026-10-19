import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { createPet } from '@/api/endpoints/pets';
import { PageHeader } from '@/components/ui/PageHeader';
import { showFlash } from '@/lib/flash';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useOwnerProfile } from '../ownerContext';
import {
  emptyPetForm,
  toCreateRequest,
  type PetFormValues,
} from './petFormModel';
import { PetForm } from './PetForm';
import { useStorePet } from './queries';

export function PetCreatePage() {
  const { t } = useTranslation('pets');
  useDocumentTitle(t('form.createPageTitle'));
  const navigate = useNavigate();
  const profile = useOwnerProfile();
  const storePet = useStorePet();

  const mutation = useMutation({
    mutationFn: ({ values, today }: { values: PetFormValues; today: string }) =>
      createPet(toCreateRequest(values, profile.userId, today)),
    onSuccess: async ({ pet }) => {
      storePet(pet);
      showFlash('pets:form.created', { values: { name: pet.name } });
      await navigate(`/panel/pets/${pet.id}`, { replace: true });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('form.createTitle')} lead={t('form.createLead')} />
      <PetForm
        mode="create"
        initialValues={emptyPetForm()}
        submitting={mutation.isPending}
        submitError={mutation.error}
        submitLabel={t('form.submitCreate')}
        onSubmit={(values, today) => mutation.mutate({ values, today })}
        onCancel={() => void navigate('/panel/pets')}
      />
    </div>
  );
}
