import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  ArrowLeftIcon,
  DocumentIcon,
  PlusIcon,
  ShieldIcon,
  UserIcon,
} from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PawIcon } from '@/components/ui/PawIcon';
import { formatDate, formatPhone } from '@/lib/format';
import { isUuidV4 } from '@/lib/ids';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { accessFromScopes, canWriteRecords } from '../../health/healthAccess';
import { HealthSection } from '../../health/HealthSection';
import { useConsentLabels } from '../../panel/consents/useConsentLabels';
import { PetAvatar } from '../../panel/pets/PetAvatar';
import { usePetLabels } from '../../panel/pets/usePetLabels';
import { useClinicAccount } from '../clinicContext';
import {
  isPatientNotFound,
  useClinicConsentFor,
  usePatient,
  usePatientOverview,
} from '../queries';
import { UploadDocumentModal } from './UploadDocumentModal';

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-fg">
        <span className="text-fg-muted">{icon}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="font-bold wrap-break-word text-fg">{children}</dd>
    </div>
  );
}

function PatientNotFound() {
  const { t } = useTranslation('clinic');
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-soft light:ring-1 light:ring-line">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-fg-muted">
        <PawIcon className="size-9" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-fg">
        {t('patient.notFoundTitle')}
      </h1>
      <p className="mt-2 max-w-sm text-fg-muted">{t('patient.notFoundBody')}</p>
      <Link
        to="/clinic/patients"
        className={buttonClasses('primary', 'md', 'mt-6')}
      >
        {t('patient.back')}
      </Link>
    </div>
  );
}

function formatChip(chip: string): string {
  return chip.replace(/^(\d{3})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4');
}

export function PatientDetailPage() {
  const { t, i18n } = useTranslation('clinic');
  const { petId = '' } = useParams();
  const [uploading, setUploading] = useState(false);
  const clinic = useClinicAccount();
  const overview = usePatientOverview(clinic.id, petId);
  const pet = usePatient(petId);
  const consent = useClinicConsentFor(petId);
  const petLabels = usePetLabels();
  const consentLabels = useConsentLabels();
  useDocumentTitle(overview.data?.pet.name);

  if (!isUuidV4(petId)) return <PatientNotFound />;
  if (overview.isError && isPatientNotFound(overview.error)) {
    return <PatientNotFound />;
  }
  if (overview.isError) return <ErrorAlert error={overview.error} />;
  if (overview.isPending) return <LoadingBlock />;

  const summary = overview.data.pet;
  const full = pet.data;
  const age = full ? petLabels.age(full) : null;
  const scopes = consent.data?.scopes ?? [];
  const writable = canWriteRecords(scopes);

  return (
    <div className="space-y-6">
      <Link
        to="/clinic/patients"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-fg-muted hover:text-fg"
      >
        <ArrowLeftIcon className="size-4" />
        {t('patient.back')}
      </Link>

      <section className="flex flex-col gap-5 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:flex-row sm:items-center sm:p-8">
        <PetAvatar species={summary.species} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold wrap-break-word text-fg">
            {summary.name}
          </h1>
          <p className="mt-1 wrap-break-word text-fg-muted">
            {petLabels.breed(summary.breed)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{petLabels.species(summary.species)}</Badge>
            {full && <Badge>{petLabels.sex(full.sex)}</Badge>}
            {age && <Badge>{age}</Badge>}
            {overview.data.pendingDraftReviewCount > 0 && (
              <Link
                to={`/clinic/drafts?pet=${petId}`}
                className="group inline-flex min-h-11 items-center rounded-lg"
              >
                <Badge
                  tone="brand"
                  className="underline-offset-2 group-hover:underline"
                >
                  {t('patient.pendingDrafts', {
                    count: overview.data.pendingDraftReviewCount,
                  })}
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={t('patient.ownerTitle')}
          icon={<UserIcon className="size-5" />}
        >
          {overview.data.owner ? (
            <div>
              <p className="text-lg font-extrabold wrap-break-word text-fg">
                {overview.data.owner.fullName}
              </p>
              <a
                href={`tel:${overview.data.owner.phone}`}
                className="mt-1 inline-flex min-h-11 items-center font-bold text-fg tabular-nums underline underline-offset-4 hover:text-accent-fg"
              >
                {formatPhone(overview.data.owner.phone, i18n.language)}
              </a>
            </div>
          ) : (
            <p className="text-fg-muted">{t('patient.ownerNoAccess')}</p>
          )}
        </Card>

        <Card
          title={t('patient.consentTitle')}
          icon={<ShieldIcon className="size-5" />}
        >
          {consent.isPending && <LoadingBlock />}
          {consent.isSuccess && consent.data ? (
            <div className="space-y-3">
              <ul className="flex flex-wrap gap-2">
                {consent.data.scopes.map((scope) => (
                  <li key={scope}>
                    <Badge tone="sage">{consentLabels.scopeLabel(scope)}</Badge>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-fg-muted">
                {t('patient.consentUntil', {
                  date: formatDate(consent.data.expiresAt, i18n.language),
                })}
              </p>
            </div>
          ) : null}
          {(consent.isError || (consent.isSuccess && !consent.data)) && (
            <p className="text-fg-muted">{t('patient.consentUnknown')}</p>
          )}
        </Card>
      </div>

      <Card
        title={t('patient.infoTitle')}
        icon={<PawIcon className="size-5" />}
      >
        <dl className="divide-y divide-line">
          <Row label={t('patient.species')}>
            {petLabels.species(summary.species)}
          </Row>
          <Row label={t('patient.breed')}>{petLabels.breed(summary.breed)}</Row>
          {full && (
            <Row label={t('patient.sex')}>{petLabels.sex(full.sex)}</Row>
          )}
          <Row label={t('patient.birthDate')}>
            {summary.birthDate ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {formatDate(summary.birthDate, i18n.language)}
                {full?.isBirthDateEstimated && (
                  <Badge tone="brand">{t('patient.estimated')}</Badge>
                )}
              </span>
            ) : (
              t('patient.unknown')
            )}
          </Row>
          <Row label={t('patient.age')}>{age ?? t('patient.unknown')}</Row>
          {full && (
            <Row label={t('patient.neutered')}>
              {full.isNeutered ? t('patient.yes') : t('patient.no')}
            </Row>
          )}
          <Row label={t('patient.chip')}>
            {full?.chipNumber ? (
              <span className="tabular-nums">
                {formatChip(full.chipNumber)}
              </span>
            ) : summary.chipNumberMasked ? (
              <span>
                <span className="tabular-nums">{summary.chipNumberMasked}</span>
                <span className="mt-1 block text-sm font-normal text-fg-muted">
                  {t('patient.chipHidden')}
                </span>
              </span>
            ) : (
              t('patient.noChip')
            )}
          </Row>
        </dl>
      </Card>

      {consent.isPending ? (
        <LoadingBlock />
      ) : (
        <HealthSection
          key={petId}
          petId={petId}
          access={accessFromScopes(scopes)}
          ownClinicId={clinic.id}
          actions={
            writable && (
              <>
                <Link
                  to={`/clinic/patients/${petId}/records/new`}
                  className={buttonClasses('primary', 'sm')}
                >
                  <PlusIcon className="size-4" />
                  {t('patient.addRecord')}
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setUploading(true)}
                >
                  <DocumentIcon className="size-4" />
                  {t('patient.uploadDocument')}
                </Button>
              </>
            )
          }
        />
      )}
      {uploading && (
        <UploadDocumentModal
          clinicId={clinic.id}
          petId={petId}
          petName={summary.name}
          onClose={() => setUploading(false)}
        />
      )}
    </div>
  );
}
