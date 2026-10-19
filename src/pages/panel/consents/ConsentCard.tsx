import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ConsentStatus, type Consent, type Pet } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { BuildingIcon } from '@/components/ui/icons';
import { formatDate } from '@/lib/format';
import { PetAvatar } from '../pets/PetAvatar';
import type { ClinicLookup } from './queries';
import { useConsentLabels } from './useConsentLabels';

const STATUS_TONES = {
  [ConsentStatus.ACTIVE]: 'sage',
  [ConsentStatus.REVOKED]: 'neutral',
  [ConsentStatus.EXPIRED]: 'brand',
} as const;

export function ConsentCard({
  consent,
  pet,
  clinic,
  onRevoke,
}: {
  consent: Consent;
  pet: Pet | undefined;
  clinic: ClinicLookup;
  onRevoke: (clinicName: string, petName: string) => void;
}) {
  const { t, i18n } = useTranslation('consents');
  const labels = useConsentLabels();

  const petName = pet?.name ?? t('list.unknownPet');
  const clinicName =
    clinic && clinic !== 'missing' ? clinic.name : t('list.unknownClinic');
  const active = consent.status === ConsentStatus.ACTIVE;
  const editLink = `/panel/consents/new?clinic=${consent.clinicId}&pet=${consent.petId}`;
  const tone =
    STATUS_TONES[consent.status as keyof typeof STATUS_TONES] ?? 'neutral';

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-cream-300/60 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          {pet ? (
            <PetAvatar species={pet.species} />
          ) : (
            <span className="size-14 shrink-0 rounded-2xl bg-cream-200" />
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-cocoa-900">
              {petName}
            </p>
            <p className="flex items-center gap-1.5 truncate text-sm text-cocoa-600">
              <BuildingIcon className="size-4 shrink-0" />
              <span className="truncate">
                {clinic === undefined ? '…' : clinicName}
              </span>
              {clinic && clinic !== 'missing' && !clinic.isActive && (
                <Badge tone="coral">{t('list.inactiveClinic')}</Badge>
              )}
            </p>
          </div>
        </div>
        <Badge tone={tone}>{labels.status(consent.status)}</Badge>
      </div>

      <div>
        <p className="text-xs font-bold tracking-wider text-cocoa-500 uppercase">
          {t('list.scopes')}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {consent.scopes.map((scope) => (
            <li key={scope}>
              <Badge tone={active ? 'sage' : 'neutral'}>
                {labels.scopeLabel(scope)}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-cocoa-500">
            {consent.status === ConsentStatus.REVOKED
              ? t('list.revokedAt')
              : consent.status === ConsentStatus.EXPIRED
                ? t('list.expiredAt')
                : t('list.expiresAt')}
          </dt>
          <dd className="font-bold text-cocoa-800">
            {formatDate(
              consent.status === ConsentStatus.REVOKED && consent.revokedAt
                ? consent.revokedAt
                : consent.expiresAt,
              i18n.language,
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-cocoa-500">
            {t('list.grantedAt')}
          </dt>
          <dd className="font-bold text-cocoa-800">
            {formatDate(consent.grantedAt, i18n.language)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap justify-end gap-2 border-t border-cream-200 pt-4">
        {active ? (
          <>
            <button
              type="button"
              onClick={() => onRevoke(clinicName, petName)}
              className={buttonClasses('ghost', 'sm', 'text-coral-700')}
            >
              {t('list.revoke')}
            </button>
            <Link to={editLink} className={buttonClasses('secondary', 'sm')}>
              {t('list.edit')}
            </Link>
          </>
        ) : (
          <Link to={editLink} className={buttonClasses('secondary', 'sm')}>
            {t('list.renew')}
          </Link>
        )}
      </div>
    </article>
  );
}
