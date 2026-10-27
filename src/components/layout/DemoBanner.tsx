import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon } from '@/components/ui/icons';
import { KvkkModal } from '@/legal/KvkkModal';

export const DEMO_BANNER_KEY = 'pp.demoBanner.dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DEMO_BANNER_KEY) === '1';
  } catch {
    return false;
  }
}

function storeDismissed(): void {
  try {
    localStorage.setItem(DEMO_BANNER_KEY, '1');
  } catch {
    return;
  }
}

export function DemoBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [termsOpen, setTermsOpen] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-label={t('demoBanner.label')}
      className="bg-accent-tint text-accent-strong"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-1 text-sm sm:items-center sm:px-6">
        <p className="flex-1 py-2.5">
          {t('demoBanner.text')}{' '}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="font-bold underline underline-offset-2 hover:decoration-2"
          >
            {t('demoBanner.details')}
          </button>
        </p>
        <button
          type="button"
          onClick={() => {
            storeDismissed();
            setDismissed(true);
          }}
          aria-label={t('demoBanner.close')}
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-xl hover:bg-accent/20"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <KvkkModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </aside>
  );
}
