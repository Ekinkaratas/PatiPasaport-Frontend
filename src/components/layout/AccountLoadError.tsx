import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

export function AccountLoadError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="mb-3 font-bold text-cocoa-800">{title}</p>
      <ErrorAlert error={error} />
      <Button className="mt-4" variant="secondary" onClick={onRetry}>
        {t('actions.retry')}
      </Button>
    </div>
  );
}
