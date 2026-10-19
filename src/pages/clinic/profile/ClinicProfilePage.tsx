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
      <dt className="text-sm font-semibold text-cocoa-500">{label}</dt>
      <dd className="font-semibold break-all text-cocoa-800">{children}</dd>
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
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60 sm:p-8">
        <dl className="divide-y divide-cream-200">
          <Row label={t('profile.name')}>{clinic.name}</Row>
          <Row label={t('profile.taxNumber')}>
            <span className="font-mono">{clinic.taxNumber}</span>
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
        <p className="mt-4 text-sm text-cocoa-500">
          {t('profile.editNote', { email: CONTACT_EMAIL })}
        </p>
      </section>

      <ClinicCodeCard clinicId={clinic.id} />

      <section className="rounded-3xl bg-coral-50 p-6 ring-1 ring-coral-100 sm:p-8">
        <h2 className="text-lg font-extrabold text-coral-700">
          {t('profile.dangerTitle')}
        </h2>
        <p className="mt-1 text-cocoa-700">{t('profile.dangerBody')}</p>
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
