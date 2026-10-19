import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/auth/useSession';
import { buttonClasses } from '@/components/ui/buttonClasses';
import {
  ArrowRightIcon,
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
      <h2 className="text-3xl font-extrabold tracking-tight text-balance text-cocoa-900 sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-4 text-lg text-pretty text-cocoa-600">{lead}</p>
      )}
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
      <ArrowRightIcon className="size-5" />
    </Link>
  );
}

function Hero() {
  const { t } = useTranslation('landing');

  return (
    <section className="relative overflow-hidden">
      <PawIcon className="pointer-events-none absolute -top-16 -left-20 size-72 -rotate-12 text-brand-100/80" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div>
          <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-700">
            {t('hero.eyebrow')}
          </p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-cocoa-900 sm:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-cocoa-600 sm:text-xl">
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
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-brand-200/70" />
      <div className="relative -rotate-2 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-bold text-cocoa-600">
            {t('passportCard.label')}
          </span>
          <PawIcon className="size-6 text-brand-400" />
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-brand-100 text-brand-500">
            <PawIcon className="size-10" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-cocoa-900">
              {t('passportCard.petName')}
            </p>
            <p className="text-sm text-cocoa-500">
              {t('passportCard.petMeta')}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2 font-mono text-sm text-cocoa-600">
          <LockIcon className="size-4 text-cocoa-500" />
          <span className="font-sans font-semibold">
            {t('passportCard.chip')}
          </span>
          <span className="tracking-widest">•••• •••• ••• 4821</span>
        </div>

        <p className="mt-5 text-xs font-bold tracking-wider text-cocoa-500 uppercase">
          {t('passportCard.vaccinesTitle')}
        </p>
        <ul className="mt-2 space-y-2 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-sage-100 text-sage-700">
                <CheckIcon className="size-3.5" strokeWidth={3} />
              </span>
              {t('passportCard.vaccine1')}
            </span>
            <span className="text-cocoa-500">
              {t('passportCard.vaccine1Date')}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-brand-100 text-brand-700">
                <ClockIcon className="size-3.5" />
              </span>
              {t('passportCard.vaccine2')}
            </span>
            <span className="text-brand-700">
              {t('passportCard.vaccine2Date')}
            </span>
          </li>
        </ul>

        <div className="mt-5 rounded-2xl bg-sage-50 p-4 ring-1 ring-sage-100">
          <p className="text-xs font-bold tracking-wider text-sage-700 uppercase">
            {t('passportCard.consentTitle')}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <BuildingIcon className="size-5 shrink-0 text-sage-600" />
            <div className="min-w-0">
              <p className="truncate font-bold text-cocoa-800">
                {t('passportCard.consentClinic')}
              </p>
              <p className="text-sm text-cocoa-500">
                {t('passportCard.consentScope')}
              </p>
            </div>
            <ShieldIcon className="ml-auto size-5 shrink-0 text-sage-600" />
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
    <section id="how-it-works" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title={t('howItWorks.title')}
          lead={t('howItWorks.lead')}
        />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-3xl bg-cream-100 p-7 ring-1 ring-cream-300/60"
            >
              <span className="absolute top-6 right-6 text-5xl font-extrabold text-cream-300">
                {index + 1}
              </span>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-700 text-white shadow-sm">
                <step.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-cocoa-900">
                {step.title}
              </h3>
              <p className="mt-2 text-cocoa-600">{step.body}</p>
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
              className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-sage-100 text-sage-700">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-cocoa-900">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-cocoa-600">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CheckList({
  items,
  tone,
}: {
  items: string[];
  tone: 'brand' | 'sage';
}) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
              tone === 'brand'
                ? 'bg-white/25 text-white'
                : 'bg-sage-100 text-sage-700',
            )}
          >
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
      className={cn('flex flex-col rounded-3xl p-8 sm:p-10', className)}
    >
      {children}
    </div>
  );
}

function Audiences() {
  const { t } = useTranslation('landing');

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading title={t('audiences.title')} />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <AudienceCard className="bg-brand-700 text-white">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/20">
              <PawIcon className="size-7" />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold">
              {t('audiences.ownersTitle')}
            </h3>
            <CheckList
              tone="brand"
              items={[
                t('audiences.owners1'),
                t('audiences.owners2'),
                t('audiences.owners3'),
              ]}
            />
            <div className="mt-auto pt-8">
              <Link
                to="/register"
                className={cn(
                  buttonClasses('secondary', 'md'),
                  'ring-0 text-brand-700',
                )}
              >
                {t('audiences.ownersCta')}
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </AudienceCard>

          <AudienceCard
            id="clinics"
            className="scroll-mt-24 bg-cream-100 ring-1 ring-cream-300/60"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-sage-100 text-sage-700">
              <BuildingIcon className="size-6" />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold text-cocoa-900">
              {t('audiences.clinicsTitle')}
            </h3>
            <ul className="mt-6 space-y-3 text-cocoa-700">
              {[
                { icon: SearchIcon, text: t('audiences.clinics1') },
                { icon: StethoscopeIcon, text: t('audiences.clinics2') },
                { icon: BoxIcon, text: t('audiences.clinics3') },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <item.icon className="mt-0.5 size-5 shrink-0 text-sage-600" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <p className="text-sm text-cocoa-600">
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
          {PET_SPECIES.map((species, index) => (
            <li
              key={species}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold text-cocoa-700 shadow-sm ring-1 ring-cream-300/60"
            >
              <PawIcon
                className={cn(
                  'size-4',
                  index % 2 === 0 ? 'text-brand-400' : 'text-sage-500',
                )}
              />
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
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-cocoa-800 px-6 py-14 text-center text-white sm:px-12">
        <PawIcon className="pointer-events-none absolute -top-10 -right-10 size-48 rotate-12 text-white/5" />
        <PawIcon className="pointer-events-none absolute -bottom-12 -left-8 size-40 -rotate-12 text-white/5" />
        <SyringeIcon className="mx-auto size-8 text-brand-300" />
        <h2 className="relative mt-4 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          {t('cta.title')}
        </h2>
        <p className="relative mt-3 text-lg text-cream-200">{t('cta.body')}</p>
        <PrimaryCta label={t('cta.button')} className="relative mt-8" />
      </div>
    </section>
  );
}
