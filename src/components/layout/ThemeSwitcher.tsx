import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { MoonIcon, SunIcon } from '@/components/ui/icons';
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from '@/lib/theme';
import { segmentedButtonClasses, segmentedRailClasses } from './segmented';

const OPTIONS: Array<{
  value: ThemePreference;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { value: 'light', icon: SunIcon },
  { value: 'dark', icon: MoonIcon },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const preference = useThemePreference();

  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className={segmentedRailClasses(className)}
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            title={t(`theme.${value}`)}
            onClick={() => setThemePreference(value)}
            className={segmentedButtonClasses(active)}
          >
            <Icon className="size-5" />
            <span className="sr-only">{t(`theme.${value}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
