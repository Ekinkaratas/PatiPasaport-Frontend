import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PlusIcon, ShieldIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { pageCountOf, parsePage } from '@/lib/pagination';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { usePets } from '../pets/queries';
import { ConsentCard } from './ConsentCard';
import { CONSENTS_PAGE_SIZE, useClinicDirectory, useConsents } from './queries';
import { RevokeConsentModal, type RevokeTarget } from './RevokeConsentModal';

function EmptyConsents() {
  const { t } = useTranslation('consents');
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-soft ring-1 ring-cream-300/60">
      <span className="grid size-16 place-items-center rounded-2xl bg-sage-100 text-sage-600">
        <ShieldIcon className="size-9" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-cocoa-900">
        {t('list.emptyTitle')}
      </h2>
      <p className="mt-2 max-w-sm text-cocoa-600">{t('list.emptyBody')}</p>
      <Link
        to="/panel/consents/new"
        className={buttonClasses('primary', 'md', 'mt-6')}
      >
        <PlusIcon className="size-5" />
        {t('list.emptyCta')}
      </Link>
    </div>
  );
}

export function ConsentsPage() {
  const { t } = useTranslation('consents');
  useDocumentTitle(t('list.pageTitle'));
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const consents = useConsents(page);
  const pets = usePets();
  const clinics = useClinicDirectory(
    consents.data?.consents.map((consent) => consent.clinicId) ?? [],
  );
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);

  const pageCount = consents.data
    ? pageCountOf(consents.data.total, CONSENTS_PAGE_SIZE)
    : 1;
  const goTo = (next: number) =>
    setSearchParams(next > 1 ? { page: String(next) } : {});

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('list.title')}
        lead={t('list.lead')}
        actions={
          consents.data && consents.data.total > 0 ? (
            <Link
              to="/panel/consents/new"
              className={buttonClasses('primary', 'md')}
            >
              <PlusIcon className="size-5" />
              {t('list.add')}
            </Link>
          ) : undefined
        }
      />

      {consents.isPending && <LoadingBlock />}
      {consents.isError && <ErrorAlert error={consents.error} />}
      {consents.isSuccess &&
        (consents.data.total === 0 ? (
          <EmptyConsents />
        ) : (
          <>
            <ul className="space-y-4">
              {consents.data.consents.map((consent) => (
                <li key={consent.consentId}>
                  <ConsentCard
                    consent={consent}
                    pet={pets.data?.find((pet) => pet.id === consent.petId)}
                    clinic={clinics[consent.clinicId]}
                    onRevoke={(clinicName, petName) =>
                      setRevokeTarget({
                        consentId: consent.consentId,
                        clinicName,
                        petName,
                      })
                    }
                  />
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCount}
              busy={consents.isFetching}
              onChange={goTo}
            />
          </>
        ))}

      <RevokeConsentModal
        target={revokeTarget}
        onClose={() => setRevokeTarget(null)}
      />
    </div>
  );
}
