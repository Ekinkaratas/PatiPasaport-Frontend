import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/api/errors';
import { translateError } from '@/i18n/translateError';
import { cn } from '@/lib/cn';

/**
 * Hata kutusu. Backend'den correlationId geldiyse "Destek kodu" olarak
 * gösterilir; kullanıcı destek isterken bu kodu iletebilir.
 */
export function ErrorAlert({
  error,
  className,
  reveal = false,
}: {
  error: unknown;
  className?: string;
  reveal?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const correlationId = isApiError(error) ? error.correlationId : undefined;

  useEffect(() => {
    if (!reveal || !ref.current) return;
    ref.current.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [reveal, error]);

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'rounded-xl bg-danger-tint px-4 py-3 text-sm text-danger',
        className,
      )}
    >
      <p className="font-semibold">{translateError(error, i18n)}</p>
      {correlationId && (
        <p className="mt-1 font-mono text-xs text-danger">
          {t('supportCode', { code: correlationId })}
        </p>
      )}
    </div>
  );
}
