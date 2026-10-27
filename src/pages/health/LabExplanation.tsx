import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/api/errors';
import { LabExplanationStatus } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ChartIcon, ChevronDownIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { isUuidV4 } from '@/lib/ids';
import { useLabExplanation } from './queries';

const HIDDEN_STATUSES = [403, 404];

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function LabExplanation({ recordId }: { recordId: string }) {
  const { t, i18n } = useTranslation('health');
  const explanation = useLabExplanation(recordId);
  const [open, setOpen] = useState(true);
  const [asking, setAsking] = useState(false);
  const [consented, setConsented] = useState(false);
  const bodyId = useId();
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consented) regionRef.current?.focus();
  }, [consented]);

  if (!isUuidV4(recordId)) return null;

  if (explanation.isError) {
    if (
      isApiError(explanation.error) &&
      HIDDEN_STATUSES.includes(explanation.error.status)
    ) {
      return null;
    }
    return <ErrorAlert error={explanation.error} />;
  }

  const data = explanation.data;

  if (!consented) {
    if (!data) return null;
    return (
      <>
        <div className="flex flex-col gap-3 rounded-xl bg-bg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex min-w-0 items-center gap-3 text-sm text-fg">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-tint text-accent-strong">
              <ChartIcon className="size-4" />
            </span>
            <span className="min-w-0 wrap-break-word">
              {t('explanation.askLead')}
            </span>
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => setAsking(true)}
          >
            {t('explanation.ask')}
          </Button>
        </div>
        <Modal
          open={asking}
          onClose={() => setAsking(false)}
          title={t('explanation.consentTitle')}
          className="max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setAsking(false)}>
                {t('explanation.consentCancel')}
              </Button>
              <Button
                onClick={() => {
                  setAsking(false);
                  setConsented(true);
                }}
              >
                {t('explanation.consentConfirm')}
              </Button>
            </div>
          }
        >
          <div className="px-6 py-5">
            <p className="flex items-start gap-3 text-fg">
              <InfoIcon className="mt-1 size-5 shrink-0 text-fg-muted" />
              <span>{t('explanation.disclaimer')}</span>
            </p>
          </div>
        </Modal>
      </>
    );
  }

  const region = (content: ReactNode) => (
    <div ref={regionRef} tabIndex={-1} className="outline-none">
      {content}
    </div>
  );

  if (!data || data.status === LabExplanationStatus.PENDING) {
    return region(
      <p
        aria-live="polite"
        className="flex items-start gap-3 rounded-xl bg-bg px-4 py-3 text-sm text-fg-muted"
      >
        <Spinner className="shrink-0" />
        <span>{t('explanation.pending')}</span>
      </p>,
    );
  }

  if (data.status !== LabExplanationStatus.READY) {
    return region(
      <p className="rounded-xl bg-bg px-4 py-3 text-sm wrap-break-word text-fg-muted">
        {t('explanation.failed')}
      </p>,
    );
  }

  const confidence = new Intl.NumberFormat(
    i18n.language === 'tr' ? 'tr-TR' : 'en-GB',
    {
      style: 'percent',
      maximumFractionDigits: 0,
    },
  ).format(data.confidence || 0);

  return region(
    <div className="rounded-xl bg-bg p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <h4 className="flex min-w-0 items-center gap-2 font-extrabold text-fg">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-tint text-accent-strong">
            <ChartIcon className="size-4" />
          </span>
          <span className="min-w-0 wrap-break-word">
            {t('explanation.title')}
          </span>
        </h4>
        <Badge className="col-start-1 row-start-2 ml-10 justify-self-start tabular-nums sm:col-start-2 sm:row-start-1 sm:ml-0">
          {t('explanation.confidence', { value: confidence })}
        </Badge>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? t('explanation.hide') : t('explanation.show')}
          title={open ? t('explanation.hide') : t('explanation.show')}
          onClick={() => setOpen((value) => !value)}
          className="col-start-2 row-start-1 grid size-11 place-items-center rounded-xl text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg sm:col-start-3"
        >
          <ChevronDownIcon
            className={cn('size-5 transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>
      <div id={bodyId} hidden={!open} className="mt-4 space-y-4">
        {data.summary && (
          <p className="whitespace-pre-line wrap-break-word text-fg">
            {data.summary}
          </p>
        )}
        {data.items.length > 0 && (
          <dl className="space-y-3 text-sm">
            {data.items.map((item, index) => (
              <div key={`${index}-${item.testName}`} className="min-w-0">
                <dt className="font-bold whitespace-pre-line wrap-break-word text-fg">
                  {item.testName}
                </dt>
                <dd className="mt-0.5 whitespace-pre-line wrap-break-word text-fg">
                  {item.explanation}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="space-y-2 border-t border-line pt-3 text-sm text-fg-muted">
          {data.generatedAt && (
            <p>
              {t('explanation.generatedAt', {
                date: formatDateTime(data.generatedAt, i18n.language),
              })}
            </p>
          )}
          <p className="flex items-start gap-2">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <span>{t('explanation.disclaimer')}</span>
          </p>
        </div>
      </div>
    </div>,
  );
}
