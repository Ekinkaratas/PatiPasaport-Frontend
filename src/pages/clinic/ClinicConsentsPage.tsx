import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ShieldIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/format';
import { pageCountOf, parsePage } from '@/lib/pagination';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useConsentLabels } from '../panel/consents/useConsentLabels';
import { PetAvatar } from '../panel/pets/PetAvatar';
import { usePetLabels } from '../panel/pets/usePetLabels';
import {
  CLINIC_CONSENTS_PAGE_SIZE,
  useClinicConsents,
  usePatientsByIds,
} from './queries';

export function ClinicConsentsPage() {
  const { t, i18n } = useTranslation('clinic');
  useDocumentTitle(t('consents.pageTitle'));
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const consents = useClinicConsents(page);
  const pets = usePatientsByIds(
    consents.data?.consents.map((consent) => consent.petId) ?? [],
  );
  const petLabels = usePetLabels();
  const consentLabels = useConsentLabels();

  return (
    <div className="space-y-6">
      <PageHeader title={t('consents.title')} lead={t('consents.lead')} />
      {consents.isPending && <LoadingBlock />}
      {consents.isError && <ErrorAlert error={consents.error} />}
      {consents.isSuccess &&
        (consents.data.total === 0 ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-soft ring-1 ring-cream-300/60">
            <span className="grid size-16 place-items-center rounded-2xl bg-sage-100 text-sage-600">
              <ShieldIcon className="size-9" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-cocoa-900">
              {t('consents.emptyTitle')}
            </h2>
            <p className="mt-2 max-w-sm text-cocoa-600">
              {t('consents.emptyBody')}
            </p>
            <Link
              to="/clinic"
              className={buttonClasses('primary', 'md', 'mt-6')}
            >
              {t('consents.showCode')}
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {consents.data.consents.map((consent) => {
                const pet = pets[consent.petId];
                return (
                  <li
                    key={consent.consentId}
                    className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-cream-300/60 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      {pet ? (
                        <PetAvatar species={pet.species} />
                      ) : (
                        <span className="size-14 shrink-0 rounded-2xl bg-cream-200" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-lg font-extrabold text-cocoa-900">
                          {pet === undefined
                            ? '…'
                            : pet === null
                              ? t('consents.unknownPet')
                              : pet.name}
                        </p>
                        {pet && (
                          <p className="truncate text-sm text-cocoa-500">
                            {petLabels.species(pet.species)} ·{' '}
                            {petLabels.breed(pet.breed)}
                          </p>
                        )}
                        <ul
                          className="mt-2 flex flex-wrap gap-1.5"
                          aria-label={t('consents.scopes')}
                        >
                          {consent.scopes.map((scope) => (
                            <li key={scope}>
                              <Badge tone="sage">
                                {consentLabels.scopeLabel(scope)}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <p className="text-sm text-cocoa-600">
                        <span className="font-semibold">
                          {t('consents.expires')}:
                        </span>{' '}
                        {formatDate(consent.expiresAt, i18n.language)}
                      </p>
                      <Link
                        to={`/clinic/patients/${consent.petId}`}
                        className={buttonClasses('secondary', 'sm')}
                      >
                        {t('consents.openPatient')}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCountOf(
                consents.data.total,
                CLINIC_CONSENTS_PAGE_SIZE,
              )}
              busy={consents.isFetching}
              onChange={(next) =>
                setSearchParams(next > 1 ? { page: String(next) } : {})
              }
            />
          </>
        ))}
    </div>
  );
}
