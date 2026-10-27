import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { CONTACT_EMAIL } from '@/config/site';
import { formatDate, formatPhone } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { ClinicCodeCard } from '../ClinicCodeCard';
import { useClinicAccount } from '../clinicContext';
import { DeactivateClinicModal } from './DeactivateClinicModal';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="font-bold wrap-break-word text-fg">{children}</dd>
    </div>
  );
}

export function ClinicProfilePage() {
  const { t, i18n } = useTranslation('clinic');
  useDocumentTitle(t('profile.pageTitle'));
  const clinic = useClinicAccount();
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title={t('profile.title')} />
      <section className="rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8">
        <dl className="divide-y divide-line">
          <Row label={t('profile.name')}>{clinic.name}</Row>
          <Row label={t('profile.taxNumber')}>
            <span className="tabular-nums">{clinic.taxNumber}</span>
          </Row>
          <Row label={t('profile.phone')}>
            {formatPhone(clinic.phone, i18n.language)}
          </Row>
          <Row label={t('profile.email')}>{clinic.email}</Row>
          <Row label={t('profile.since')}>
            {formatDate(clinic.createdAt, i18n.language)}
          </Row>
          <Row label={t('profile.status')}>
            <Badge tone={clinic.isActive ? 'sage' : 'coral'}>
              {clinic.isActive ? t('profile.active') : t('profile.inactive')}
            </Badge>
          </Row>
        </dl>
        <p className="mt-4 text-sm text-fg-muted">
          {t('profile.editNote', { email: CONTACT_EMAIL })}
        </p>
      </section>

      <ClinicCodeCard clinicId={clinic.id} />

      <section className="rounded-2xl bg-danger-tint p-6 sm:p-8">
        <h2 className="text-lg font-extrabold text-danger">
          {t('profile.dangerTitle')}
        </h2>
        <p className="mt-1 text-fg">{t('profile.dangerBody')}</p>
        <Button
          variant="danger"
          className="mt-5"
          onClick={() => setDeactivateOpen(true)}
        >
          {t('profile.dangerButton')}
        </Button>
      </section>

      <DeactivateClinicModal
        clinicId={clinic.id}
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
      />
    </div>
  );
}
