import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export function Pagination({
  page,
  pageCount,
  busy = false,
  onChange,
}: {
  page: number;
  pageCount: number;
  busy?: boolean;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label={t('pagination.label')}
      className="flex items-center justify-between gap-4"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1 || busy}
        onClick={() => onChange(page - 1)}
      >
        {t('pagination.previous')}
      </Button>
      <p className="text-sm font-semibold text-cocoa-600">
        {t('pagination.pageOf', { page, pages: pageCount })}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= pageCount || busy}
        onClick={() => onChange(page + 1)}
      >
        {t('pagination.next')}
      </Button>
    </nav>
  );
}
