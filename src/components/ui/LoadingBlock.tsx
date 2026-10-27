import { useTranslation } from 'react-i18next';
import { Spinner } from './Spinner';

export function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-48 items-center justify-center gap-3 text-fg-muted"
    >
      <Spinner />
      <span>{t('loading')}</span>
    </div>
  );
}
