import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ConsentStatus, type Consent, type Pet } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { BuildingIcon } from '@/components/ui/icons';
import { PawIcon } from '@/components/ui/PawIcon';
import { formatDate, todayInBusinessTimeZone } from '@/lib/format';
import { isExpiringSoon } from './consentModel';
import type { ClinicLookup } from './queries';
import { useConsentLabels } from './useConsentLabels';

const STATUS_TONES = {
  [ConsentStatus.ACTIVE]: 'sage',
  [ConsentStatus.REVOKED]: 'neutral',
  [ConsentStatus.EXPIRED]: 'neutral',
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
    <article className="flex flex-col gap-5 rounded-2xl bg-surface p-5 shadow-soft light:ring-1 light:ring-line sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
            <BuildingIcon className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-extrabold wrap-break-word text-fg">
              {clinic === undefined ? '…' : clinicName}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-fg-muted">
              <PawIcon className="size-4 shrink-0" />
              <span className="min-w-0 wrap-break-word">{petName}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {clinic && clinic !== 'missing' && !clinic.isActive && (
            <Badge tone="coral">{t('list.inactiveClinic')}</Badge>
          )}
          <Badge tone={tone}>{labels.status(consent.status)}</Badge>
          {isExpiringSoon(consent, todayInBusinessTimeZone()) && (
            <Badge tone="brand">{t('list.expiringSoon')}</Badge>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-fg-muted">
          {t('list.scopes')}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {consent.scopes.map((scope) => (
            <li key={scope}>
              <Badge>{labels.scopeLabel(scope)}</Badge>
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-bg px-4 py-3">
          <dt className="text-sm text-fg-muted">
            {consent.status === ConsentStatus.REVOKED
              ? t('list.revokedAt')
              : consent.status === ConsentStatus.EXPIRED
                ? t('list.expiredAt')
                : t('list.expiresAt')}
          </dt>
          <dd className="mt-0.5 font-bold text-fg">
            {formatDate(
              consent.status === ConsentStatus.REVOKED && consent.revokedAt
                ? consent.revokedAt
                : consent.expiresAt,
              i18n.language,
            )}
          </dd>
        </div>
        <div className="rounded-xl bg-bg px-4 py-3">
          <dt className="text-sm text-fg-muted">{t('list.grantedAt')}</dt>
          <dd className="mt-0.5 font-bold text-fg">
            {formatDate(consent.grantedAt, i18n.language)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {active ? (
          <>
            <button
              type="button"
              onClick={() => onRevoke(clinicName, petName)}
              className={buttonClasses('danger', 'sm')}
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
