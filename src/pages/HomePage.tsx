import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/auth/useSession';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/buttonClasses';
import {
  BoxIcon,
  BuildingIcon,
  CheckIcon,
  ClockIcon,
  HistoryIcon,
  KeyIcon,
  LockIcon,
  MailIcon,
  SearchIcon,
  ShieldIcon,
  StethoscopeIcon,
  SyringeIcon,
} from '@/components/ui/icons';
import { PawIcon } from '@/components/ui/PawIcon';
import { CONTACT_EMAIL } from '@/config/site';
import { PET_SPECIES } from '@/domain/constants';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function HomePage() {
  useDocumentTitle();
  return (
    <>
      <Hero />
      <HowItWorks />
      <Security />
      <Audiences />
      <Species />
      <FinalCta />
    </>
  );
}

function SectionHeading({
  title,
  lead,
  className,
}: {
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      <h2 className="text-3xl font-extrabold tracking-tight text-balance text-fg sm:text-4xl">
        {title}
      </h2>
      {lead && <p className="mt-4 text-lg text-pretty text-fg-muted">{lead}</p>}
    </div>
  );
}

/** Oturum açıksa kayıt yerine panele yönlendiren ana çağrı düğmesi. */
function PrimaryCta({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const session = useSession();
  const authenticated = session.status === 'authenticated';
  return (
    <Link
      to={authenticated ? '/panel' : '/register'}
      className={buttonClasses('primary', 'lg', className)}
    >
      {authenticated ? t('nav.dashboard') : label}
    </Link>
  );
}

function Hero() {
  const { t } = useTranslation('landing');

  return (
    <section className="relative overflow-clip">
      <div aria-hidden="true" className="pp-halo" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div>
          <p className="inline-flex rounded-lg bg-accent-tint px-3 py-1 text-sm font-bold text-accent-strong">
            {t('hero.eyebrow')}
          </p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-fg sm:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-fg-muted sm:text-xl">
            {t('hero.lead')}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <PrimaryCta label={t('hero.primaryCta')} />
            <Link
              to={{ hash: 'how-it-works' }}
              className={buttonClasses('secondary', 'lg')}
            >
              {t('hero.secondaryCta')}
            </Link>
          </div>
        </div>
        <PassportCard />
      </div>
    </section>
  );
}

function PassportCard() {
  const { t } = useTranslation('landing');

  return (
    <div
      className="relative mx-auto w-full max-w-sm rounded-2xl bg-surface p-5 shadow-soft sm:p-6 light:ring-1 light:ring-line"
      aria-hidden="true"
    >
      <span className="inline-flex rounded-lg bg-surface-2 px-2.5 py-0.5 text-sm font-bold text-fg-muted">
        {t('passportCard.label')}
      </span>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-4 rounded-xl bg-bg p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent-tint text-accent-strong">
            <PawIcon className="size-8" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-fg">
              {t('passportCard.petName')}
            </p>
            <p className="text-sm text-fg-muted">{t('passportCard.petMeta')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-bg px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-fg-muted">
            <LockIcon className="size-4" />
            {t('passportCard.chip')}
          </span>
          <span className="font-semibold text-fg tabular-nums">
            •••• •••• ••• 4821
          </span>
        </div>

        <div className="rounded-xl bg-bg p-4">
          <p className="text-sm font-bold text-fg">
            {t('passportCard.vaccinesTitle')}
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold text-fg">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ok-tint text-ok">
                  <CheckIcon className="size-3.5" strokeWidth={3} />
                </span>
                {t('passportCard.vaccine1')}
              </span>
              <Badge tone="sage">{t('passportCard.vaccine1Date')}</Badge>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold text-fg">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-strong">
                  <ClockIcon className="size-3.5" />
                </span>
                {t('passportCard.vaccine2')}
              </span>
              <Badge tone="brand">{t('passportCard.vaccine2Date')}</Badge>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-bg p-4">
          <p className="text-sm font-bold text-fg">
            {t('passportCard.consentTitle')}
          </p>
          <div className="mt-3 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ok-tint text-ok">
              <BuildingIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-fg">
                {t('passportCard.consentClinic')}
              </p>
              <p className="text-sm text-fg-muted">
                {t('passportCard.consentScope')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const { t } = useTranslation('landing');
  const steps: Array<{ icon: Icon; title: string; body: string }> = [
    {
      icon: PawIcon,
      title: t('howItWorks.step1Title'),
      body: t('howItWorks.step1Body'),
    },
    {
      icon: ShieldIcon,
      title: t('howItWorks.step2Title'),
      body: t('howItWorks.step2Body'),
    },
    {
      icon: StethoscopeIcon,
      title: t('howItWorks.step3Title'),
      body: t('howItWorks.step3Body'),
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title={t('howItWorks.title')}
          lead={t('howItWorks.lead')}
        />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl bg-surface p-7 light:ring-1 light:ring-line"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="grid size-10 place-items-center rounded-full bg-accent text-lg font-extrabold text-accent-ink">
                  {index + 1}
                </span>
                <step.icon className="size-6 text-fg-muted" />
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-fg">
                {step.title}
              </h3>
              <p className="mt-2 text-fg-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Security() {
  const { t } = useTranslation('landing');
  const features: Array<{ icon: Icon; title: string; body: string }> = [
    {
      icon: ShieldIcon,
      title: t('security.consentTitle'),
      body: t('security.consentBody'),
    },
    {
      icon: CheckIcon,
      title: t('security.scopeTitle'),
      body: t('security.scopeBody'),
    },
    {
      icon: ClockIcon,
      title: t('security.expiryTitle'),
      body: t('security.expiryBody'),
    },
    {
      icon: LockIcon,
      title: t('security.chipTitle'),
      body: t('security.chipBody'),
    },
    {
      icon: HistoryIcon,
      title: t('security.auditTitle'),
      body: t('security.auditBody'),
    },
    {
      icon: KeyIcon,
      title: t('security.sessionTitle'),
      body: t('security.sessionBody'),
    },
  ];

  return (
    <section id="security" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading title={t('security.title')} lead={t('security.lead')} />
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-2xl bg-surface p-6 light:ring-1 light:ring-line"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-accent-tint text-accent-strong">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-fg">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-fg-muted">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3 text-fg">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-strong">
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function AudienceCard({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn('flex flex-col rounded-2xl bg-bg p-8 sm:p-10', className)}
    >
      {children}
    </div>
  );
}

function Audiences() {
  const { t } = useTranslation('landing');

  return (
    <section className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading title={t('audiences.title')} />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <AudienceCard className="ring-2 ring-accent">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-ink">
              <PawIcon className="size-7" />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold text-fg">
              {t('audiences.ownersTitle')}
            </h3>
            <CheckList
              items={[
                t('audiences.owners1'),
                t('audiences.owners2'),
                t('audiences.owners3'),
              ]}
            />
            <div className="mt-auto pt-8">
              <Link to="/register" className={buttonClasses('primary', 'md')}>
                {t('audiences.ownersCta')}
              </Link>
            </div>
          </AudienceCard>

          <AudienceCard id="clinics" className="scroll-mt-24 ring-1 ring-line">
            <span className="grid size-12 place-items-center rounded-2xl bg-ok-tint text-ok">
              <BuildingIcon className="size-6" />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold text-fg">
              {t('audiences.clinicsTitle')}
            </h3>
            <ul className="mt-6 space-y-3 text-fg">
              {[
                { icon: SearchIcon, text: t('audiences.clinics1') },
                { icon: StethoscopeIcon, text: t('audiences.clinics2') },
                { icon: BoxIcon, text: t('audiences.clinics3') },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <item.icon className="mt-0.5 size-5 shrink-0 text-ok" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <p className="text-sm text-fg-muted">
                {t('audiences.clinicsNote')}
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={buttonClasses('secondary', 'md', 'mt-3')}
              >
                <MailIcon className="size-4" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </AudienceCard>
        </div>
      </div>
    </section>
  );
}

function Species() {
  const { t } = useTranslation('landing');
  const { t: tEnums } = useTranslation('enums');

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading title={t('species.title')} lead={t('species.lead')} />
        <ul className="mt-10 flex flex-wrap justify-center gap-3">
          {PET_SPECIES.map((species) => (
            <li
              key={species}
              className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 font-bold text-fg light:ring-1 light:ring-line"
            >
              <PawIcon className="size-4 text-accent-fg" />
              {tEnums(`species.${species}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  const { t } = useTranslation('landing');

  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-5xl rounded-2xl bg-surface px-6 py-14 text-center ring-1 ring-line sm:px-12">
        <SyringeIcon className="mx-auto size-8 text-accent-fg" />
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-balance text-fg sm:text-4xl">
          {t('cta.title')}
        </h2>
        <p className="mt-3 text-lg text-fg-muted">{t('cta.body')}</p>
        <PrimaryCta label={t('cta.button')} className="mt-8" />
      </div>
    </section>
  );
}
