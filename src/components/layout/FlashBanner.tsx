import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XIcon } from '@/components/ui/icons';
import { dismissFlash, useFlash } from '@/lib/flash';
import { cn } from '@/lib/cn';

const AUTO_DISMISS_MS = 6000;

type LooseT = (key: string, options?: Record<string, unknown>) => string;

export function FlashBanner() {
  const flash = useFlash();
  const { t, i18n } = useTranslation();
  const translate = i18n.t.bind(i18n) as unknown as LooseT;

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(
      () => dismissFlash(flash.id),
      AUTO_DISMISS_MS,
    );
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (!flash) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
      <div
        role="status"
        className={cn(
          'pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl px-4 py-3 shadow-soft ring-1',
          flash.tone === 'success'
            ? 'bg-ok-tint text-ok ring-ok/30'
            : 'bg-surface text-fg ring-line',
        )}
      >
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ok text-bg">
          <CheckIcon className="size-3.5" strokeWidth={3} />
        </span>
        <p className="flex-1 font-semibold">
          {translate(flash.key, flash.values)}
        </p>
        <button
          type="button"
          onClick={() => dismissFlash(flash.id)}
          aria-label={t('actions.close')}
          className="-my-2.5 -mr-2.5 grid size-11 shrink-0 place-items-center rounded-xl hover:bg-surface-2/60"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
