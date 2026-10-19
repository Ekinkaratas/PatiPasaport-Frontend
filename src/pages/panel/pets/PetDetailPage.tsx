import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ArrowLeftIcon, PencilIcon, ShieldIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import { isUuidV4 } from '@/lib/ids';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { FULL_HEALTH_ACCESS } from '../../health/healthAccess';
import { HealthSection } from '../../health/HealthSection';
import { PetAvatar } from './PetAvatar';
import { PetNotFound } from './PetNotFound';
import { isPetNotFound, usePet } from './queries';
import { usePetLabels } from './usePetLabels';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-cocoa-500">{label}</dt>
      <dd className="font-semibold text-cocoa-800">{children}</dd>
    </div>
  );
}

function formatChip(chip: string): string {
  return chip.replace(/^(\d{3})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4');
}

export function PetDetailPage() {
  const { t, i18n } = useTranslation('pets');
  const { petId = '' } = useParams();
  const pet = usePet(petId);
  const labels = usePetLabels();
  useDocumentTitle(pet.data?.name);

  if (!isUuidV4(petId)) return <PetNotFound />;
  if (pet.isError && isPetNotFound(pet.error)) return <PetNotFound />;
  if (pet.isError) return <ErrorAlert error={pet.error} />;
  if (pet.isPending) return <LoadingBlock />;

  const data = pet.data;
  const age = labels.age(data);

  return (
    <div className="space-y-6">
      <Link
        to="/panel/pets"
        className="inline-flex items-center gap-2 text-sm font-bold text-cocoa-600 hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        {t('detail.back')}
      </Link>

      <section className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60 sm:flex-row sm:items-center sm:p-8">
        <PetAvatar species={data.species} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-cocoa-900">
            {data.name}
          </h1>
          <p className="mt-1 text-cocoa-600">
            {labels.species(data.species)} · {labels.breed(data.breed)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{labels.sex(data.sex)}</Badge>
            {age && <Badge>{age}</Badge>}
            {data.isNeutered && <Badge tone="sage">{t('card.neutered')}</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link
            to={`/panel/pets/${data.id}/edit`}
            className={buttonClasses('secondary', 'md')}
          >
            <PencilIcon className="size-4" />
            {t('detail.edit')}
          </Link>
          <Link
            to={`/panel/consents/new?pet=${data.id}`}
            className={buttonClasses('ghost', 'md')}
          >
            <ShieldIcon className="size-4" />
            {t('detail.grantConsent')}
          </Link>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60 sm:p-8">
        <h2 className="text-lg font-extrabold text-cocoa-900">
          {t('detail.infoTitle')}
        </h2>
        <dl className="mt-2 divide-y divide-cream-200">
          <Row label={t('detail.species')}>{labels.species(data.species)}</Row>
          <Row label={t('detail.breed')}>{labels.breed(data.breed)}</Row>
          <Row label={t('detail.sex')}>{labels.sex(data.sex)}</Row>
          <Row label={t('detail.birthDate')}>
            {data.birthDate ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {formatDate(data.birthDate, i18n.language)}
                {data.isBirthDateEstimated && (
                  <Badge tone="brand">{t('detail.estimated')}</Badge>
                )}
              </span>
            ) : (
              t('detail.unknown')
            )}
          </Row>
          <Row label={t('detail.age')}>{age ?? t('detail.unknown')}</Row>
          <Row label={t('detail.neutered')}>
            {data.isNeutered ? t('detail.yes') : t('detail.no')}
          </Row>
          <Row label={t('detail.chip')}>
            {data.chipNumber ? (
              <span className="font-mono tracking-wide">
                {formatChip(data.chipNumber)}
              </span>
            ) : (
              t('detail.noChip')
            )}
          </Row>
          <Row label={t('detail.registeredAt')}>
            {formatDate(data.createdAt, i18n.language)}
          </Row>
        </dl>
      </section>

      <HealthSection
        key={data.id}
        petId={data.id}
        access={FULL_HEALTH_ACCESS}
      />
    </div>
  );
}
