import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n';
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n/language';
import { cn } from '@/lib/cn';

const SHORT_LABEL: Record<Language, string> = { tr: 'TR', en: 'EN' };

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={cn(
        'inline-flex rounded-full bg-cream-200 p-1 text-sm font-bold',
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const active = i18n.language === language;
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-pressed={active}
            title={t(`language.${language}`)}
            onClick={() => void changeLanguage(language)}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              active
                ? 'bg-white text-cocoa-800 shadow-sm'
                : 'text-cocoa-500 hover:text-cocoa-800',
            )}
          >
            <span aria-hidden="true">{SHORT_LABEL[language]}</span>
            <span className="sr-only">{t(`language.${language}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
