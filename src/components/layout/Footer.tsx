import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GithubIcon, MailIcon } from '@/components/ui/icons';
import { Logo } from '@/components/ui/Logo';
import { CONTACT_EMAIL, sourceLinks } from '@/config/site';
import { KvkkModal } from '@/legal/KvkkModal';

function SourceLinks() {
  const { t } = useTranslation();
  const { frontend, backend } = sourceLinks();
  const links = [
    { href: frontend, part: t('footer.sourceFrontend') },
    { href: backend, part: t('footer.sourceBackend') },
  ].filter((link): link is { href: string; part: string } =>
    Boolean(link.href),
  );

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
      <span className="font-semibold text-fg-muted">{t('footer.source')}</span>
      {links.map((link) => (
        <a
          key={link.part}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('footer.sourceLabel', { part: link.part })}
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-fg transition-colors duration-150 hover:text-accent-fg"
        >
          <GithubIcon className="size-4" />
          {link.part}
        </a>
      ))}
    </div>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const [kvkkOpen, setKvkkOpen] = useState(false);

  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-fg-muted sm:grid-cols-2 sm:px-6">
        <div>
          <Logo />
          <p className="mt-3">{t('tagline')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-fg transition-colors duration-150 hover:text-accent-fg"
          >
            <MailIcon className="size-4" />
            <span className="sr-only">{t('footer.contact')}: </span>
            {CONTACT_EMAIL}
          </a>
          <SourceLinks />
          <button
            type="button"
            onClick={() => setKvkkOpen(true)}
            className="min-h-11 w-fit text-left font-semibold text-fg transition-colors duration-150 hover:text-accent-fg hover:underline sm:text-right"
          >
            {t('footer.kvkk')}
          </button>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-fg-muted sm:px-6">
          {t('footer.rights', { year: new Date().getFullYear() })}
        </p>
      </div>
      <KvkkModal open={kvkkOpen} onClose={() => setKvkkOpen(false)} />
    </footer>
  );
}
