import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailIcon } from '@/components/ui/icons';
import { Logo } from '@/components/ui/Logo';
import { CONTACT_EMAIL } from '@/config/site';
import { KvkkModal } from '@/legal/KvkkModal';

export function Footer() {
  const { t } = useTranslation();
  const [kvkkOpen, setKvkkOpen] = useState(false);

  return (
    <footer className="border-t border-cream-300/70 bg-cream-200/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-cocoa-600 sm:grid-cols-2 sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 text-cocoa-500">{t('tagline')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 font-semibold hover:text-brand-700"
          >
            <MailIcon className="size-4" />
            <span className="sr-only">{t('footer.contact')}: </span>
            {CONTACT_EMAIL}
          </a>
          <button
            type="button"
            onClick={() => setKvkkOpen(true)}
            className="w-fit font-semibold hover:text-brand-700 hover:underline"
          >
            {t('footer.kvkk')}
          </button>
        </div>
      </div>
      <div className="border-t border-cream-300/70">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-cocoa-500 sm:px-6">
          {t('footer.rights', { year: new Date().getFullYear() })}
        </p>
      </div>
      <KvkkModal open={kvkkOpen} onClose={() => setKvkkOpen(false)} />
    </footer>
  );
}
