import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLogout } from '@/auth/hooks';
import { useSession } from '@/auth/useSession';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { MenuIcon, XIcon } from '@/components/ui/icons';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

const SECTION_LINKS = [
  { hash: 'how-it-works', label: 'nav.howItWorks' },
  { hash: 'security', label: 'nav.security' },
  { hash: 'clinics', label: 'nav.forClinics' },
] as const;

function AuthActions({ stacked = false }: { stacked?: boolean }) {
  const { t } = useTranslation();
  const session = useSession();
  const logout = useLogout();
  const layout = stacked ? 'w-full' : undefined;

  if (session.status === 'authenticated') {
    return (
      <>
        <Link
          to={session.clinicId ? '/clinic' : '/panel'}
          className={buttonClasses('primary', 'sm', layout)}
        >
          {t('nav.dashboard')}
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className={buttonClasses('secondary', 'sm', layout)}
        >
          {t('nav.logout')}
        </button>
      </>
    );
  }
  return (
    <>
      <Link to="/login" className={buttonClasses('secondary', 'sm', layout)}>
        {t('nav.login')}
      </Link>
      <Link to="/register" className={buttonClasses('primary', 'sm', layout)}>
        {t('nav.register')}
      </Link>
    </>
  );
}

export function Header() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/"
          aria-label={t('nav.home')}
          className="flex min-h-11 shrink-0 items-center rounded-xl"
        >
          <Logo />
        </Link>

        <nav
          aria-label={t('nav.mainNavigation')}
          className="hidden items-center gap-2 lg:flex"
        >
          {SECTION_LINKS.map((link) => (
            <Link
              key={link.hash}
              to={{ pathname: '/', hash: link.hash }}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-fg-muted transition-colors duration-150 hover:text-fg"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="hidden sm:flex">
            <ThemeSwitcher />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <AuthActions />
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-fg hover:bg-surface-2 lg:hidden"
          >
            {menuOpen ? (
              <XIcon className="size-6" />
            ) : (
              <MenuIcon className="size-6" />
            )}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!menuOpen}
        // Menüdeki bir bağlantı ya da düğmeye basılınca menüyü kapat.
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.closest('a, button') &&
            !target.closest('[data-keep-menu-open]')
          ) {
            setMenuOpen(false);
          }
        }}
        className="border-t border-line bg-bg px-4 pt-2 pb-4 lg:hidden"
      >
        <nav
          aria-label={t('nav.mainNavigation')}
          className="flex flex-col gap-2"
        >
          {SECTION_LINKS.map((link) => (
            <Link
              key={link.hash}
              to={{ pathname: '/', hash: link.hash }}
              className="flex min-h-11 items-center rounded-xl px-3 py-2.5 font-semibold text-fg hover:bg-surface-2"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>
        <div
          data-keep-menu-open
          className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 sm:hidden"
        >
          <span
            aria-hidden="true"
            className="text-sm font-semibold text-fg-muted"
          >
            {t('theme.label')}
          </span>
          <ThemeSwitcher />
        </div>
        <div className="mt-3 flex flex-col gap-2 md:hidden">
          <AuthActions stacked />
        </div>
      </div>
    </header>
  );
}
