import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDocumentFile } from '@/api/endpoints/records';
import { isApiError } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { translateError } from '@/i18n/translateError';
import { cn } from '@/lib/cn';
import { openFileInNewTab, saveFile } from '@/lib/fileActions';
import { UPLOAD_MIME_TYPES } from './recordModel';

type Action = 'open' | 'download';

export function DocumentActions({
  documentId,
  fileName,
  className,
}: {
  documentId: string;
  fileName: string;
  className?: string;
}) {
  const { t, i18n } = useTranslation('health');
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<unknown>(null);

  const message = (value: unknown) => {
    if (isApiError(value) && value.status === 500) {
      return t('documents.fileCorrupt');
    }
    if (isApiError(value) && value.status === 404) {
      return t('documents.fileMissing');
    }
    return translateError(value, i18n);
  };

  const run = async (action: Action) => {
    setBusy(action);
    setError(null);
    try {
      if (action === 'open') {
        await openFileInNewTab(
          () => getDocumentFile(documentId),
          t('documents.loading'),
          UPLOAD_MIME_TYPES,
        );
      } else {
        await saveFile(
          () => getDocumentFile(documentId, { download: true }),
          fileName,
        );
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex flex-wrap gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3"
          aria-label={t('documents.openLabel', { name: fileName })}
          loading={busy === 'open'}
          disabled={busy !== null}
          onClick={() => void run('open')}
        >
          {t('documents.open')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3"
          aria-label={t('documents.downloadLabel', { name: fileName })}
          loading={busy === 'download'}
          disabled={busy !== null}
          onClick={() => void run('download')}
        >
          {t('documents.download')}
        </Button>
      </div>
      {error !== null && (
        <p role="alert" className="text-sm font-semibold text-coral-700">
          {message(error)}
        </p>
      )}
    </div>
  );
}
