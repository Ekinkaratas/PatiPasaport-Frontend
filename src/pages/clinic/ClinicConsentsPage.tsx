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
          <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-soft light:ring-1 light:ring-line">
            <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-fg-muted">
              <ShieldIcon className="size-9" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-fg">
              {t('consents.emptyTitle')}
            </h2>
            <p className="mt-2 max-w-sm text-fg-muted">
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
                    className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-soft light:ring-1 light:ring-line sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      {pet ? (
                        <PetAvatar species={pet.species} />
                      ) : (
                        <span className="size-14 shrink-0 rounded-2xl bg-surface-2" />
                      )}
                      <div className="min-w-0">
                        <p className="text-lg font-extrabold wrap-break-word text-fg">
                          {pet === undefined
                            ? '…'
                            : pet === null
                              ? t('consents.unknownPet')
                              : pet.name}
                        </p>
                        {pet && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge>{petLabels.species(pet.species)}</Badge>
                            <span className="text-sm wrap-break-word text-fg-muted">
                              {petLabels.breed(pet.breed)}
                            </span>
                          </div>
                        )}
                        <ul
                          className="mt-3 flex flex-wrap gap-1.5"
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
                      <p className="text-sm text-fg-muted">
                        <span className="font-semibold">
                          {t('consents.expires')}:
                        </span>{' '}
                        <span className="font-bold text-fg">
                          {formatDate(consent.expiresAt, i18n.language)}
                        </span>
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
