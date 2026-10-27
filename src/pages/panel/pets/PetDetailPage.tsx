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
    <div className="rounded-xl bg-bg px-4 py-3">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="mt-0.5 font-bold wrap-break-word text-fg">{children}</dd>
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
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-fg-muted hover:text-fg"
      >
        <ArrowLeftIcon className="size-4" />
        {t('detail.back')}
      </Link>

      <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8">
        <PetAvatar species={data.species} size="lg" />
        <div className="min-w-0 flex-1 basis-60">
          <h1 className="text-3xl font-extrabold wrap-break-word text-fg">
            {data.name}
          </h1>
          <p className="mt-1 wrap-break-word text-fg-muted">
            {labels.breed(data.breed)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{labels.species(data.species)}</Badge>
            <Badge>{labels.sex(data.sex)}</Badge>
            {age && <Badge>{age}</Badge>}
            {data.isNeutered && <Badge tone="sage">{t('card.neutered')}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/panel/pets/${data.id}/edit`}
            className={buttonClasses('secondary', 'md')}
          >
            <PencilIcon className="size-4" />
            {t('detail.edit')}
          </Link>
          <Link
            to={`/panel/consents/new?pet=${data.id}`}
            className={buttonClasses('primary', 'md')}
          >
            <ShieldIcon className="size-4" />
            {t('detail.grantConsent')}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8">
        <h2 className="text-lg font-extrabold text-fg">
          {t('detail.infoTitle')}
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <span className="tabular-nums">
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
        showLabExplanations
      />
    </div>
  );
}
