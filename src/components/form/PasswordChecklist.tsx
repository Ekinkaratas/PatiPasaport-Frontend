import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@/components/ui/icons';
import { PASSWORD_RULES } from '@/domain/validation';
import { cn } from '@/lib/cn';

/** Şifre yazılırken kuralları canlı olarak işaretler. */
export function PasswordChecklist({
  value,
  id,
}: {
  value: string;
  id?: string;
}) {
  const { t } = useTranslation('auth');

  return (
    <div id={id} className="rounded-xl bg-cream-100 px-4 py-3 text-sm">
      <p className="font-semibold text-cocoa-600">{t('passwordRules.title')}</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.id}
              className={cn(
                'flex items-center gap-2',
                ok ? 'text-sage-700' : 'text-cocoa-500',
              )}
            >
              <span
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full',
                  ok ? 'bg-sage-500 text-white' : 'ring-1 ring-cocoa-400',
                )}
                aria-hidden="true"
              >
                {ok && <CheckIcon className="size-3" strokeWidth={3} />}
              </span>
              {t(`passwordRules.${rule.id}`)}
              <span className="sr-only">{ok ? ' ✓' : ''}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
