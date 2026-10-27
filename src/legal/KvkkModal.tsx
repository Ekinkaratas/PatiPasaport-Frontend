import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { KvkkNotice } from './KvkkNotice';

interface KvkkModalProps {
  open: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
}

export function KvkkModal({ open, onClose, onAcknowledge }: KvkkModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={t('footer.kvkk')}>
      {/* Her açılışta yeniden kurulur: "sonuna kadar okundu" durumu sıfırlanır. */}
      {open && <KvkkBody onClose={onClose} onAcknowledge={onAcknowledge} />}
    </Modal>
  );
}

function KvkkBody({
  onClose,
  onAcknowledge,
}: Pick<KvkkModalProps, 'onClose' | 'onAcknowledge'>) {
  const { t } = useTranslation();
  const { t: tAuth } = useTranslation('auth');
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const root = scrollRef.current;
    const end = endRef.current;
    if (!onAcknowledge || !root || !end) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReachedEnd(true);
          observer.disconnect();
        }
      },
      { root, threshold: 1 },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [onAcknowledge]);

  return (
    <>
      <div
        ref={scrollRef}
        tabIndex={0}
        className="min-h-0 overflow-y-auto px-6 py-5"
      >
        <KvkkNotice />
        <div ref={endRef} aria-hidden="true" className="h-px" />
      </div>
      <div className="border-t border-line px-6 py-4">
        {onAcknowledge ? (
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p
              id="kvkk-read-hint"
              aria-live="polite"
              className="text-sm text-fg-muted"
            >
              {reachedEnd ? '' : tAuth('kvkkModal.readToContinue')}
            </p>
            <Button
              onClick={onAcknowledge}
              disabled={!reachedEnd}
              aria-describedby="kvkk-read-hint"
            >
              {tAuth('kvkkModal.acknowledge')}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              {t('actions.close')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
