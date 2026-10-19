import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { uploadPetResult } from '@/api/endpoints/clinics';
import { isApiError } from '@/api/errors';
import { DocumentStatus } from '@/api/types';
import { TextArea } from '@/components/form/TextArea';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { DocumentIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { translateError } from '@/i18n/translateError';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { healthKeys, useDocumentStatus } from '../../health/queries';
import {
  formatBytes,
  UPLOAD_ACCEPT,
  UPLOAD_NOTE_MAX,
  validateUploadFile,
  validateUploadNote,
} from '../../health/recordModel';

type StatusKey = 'queued' | 'processing' | 'draftReady' | 'failed';

const STATUS_KEYS: Record<number, StatusKey> = {
  [DocumentStatus.QUEUED]: 'queued',
  [DocumentStatus.PROCESSING]: 'processing',
  [DocumentStatus.DRAFT_READY]: 'draftReady',
  [DocumentStatus.FAILED]: 'failed',
};

const SERVER_FILE_FIELDS = new Set([
  'FILE',
  'MIME_TYPE',
  'SIZE_BYTES',
  'ORIGINAL_NAME',
]);

function DocumentProgress({
  documentId,
  uploadedAt,
  petId,
}: {
  documentId: string;
  uploadedAt: string;
  petId: string;
}) {
  const { t, i18n } = useTranslation('health');
  const document = useDocumentStatus(documentId);
  const status = document.data?.status ?? DocumentStatus.QUEUED;
  const key: StatusKey = STATUS_KEYS[status] ?? 'queued';
  const tone =
    status === DocumentStatus.DRAFT_READY
      ? 'sage'
      : status === DocumentStatus.FAILED
        ? 'coral'
        : 'brand';

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex items-start gap-3 rounded-2xl bg-sage-50 px-4 py-3 text-sage-700 ring-1 ring-sage-100">
        <DocumentIcon className="mt-0.5 size-5 shrink-0" />
        <p className="font-semibold">
          {t('upload.received', {
            date: formatDateTime(uploadedAt, i18n.language),
          })}
        </p>
      </div>
      <div className="space-y-2 rounded-2xl bg-cream-100 px-4 py-3">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-cocoa-700">
          {t('upload.statusLabel')}
          <Badge tone={tone}>{t(`documentStatus.${key}`)}</Badge>
        </p>
        <p className="text-sm text-cocoa-600">
          {t(`documentStatusHint.${key}`)}
        </p>
        {status === DocumentStatus.FAILED && document.data?.failureReason && (
          <p className="font-mono text-xs text-coral-700">
            {document.data.failureReason}
          </p>
        )}
        {document.isError && <ErrorAlert error={document.error} />}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={document.isFetching}
          onClick={() => void document.refetch()}
        >
          {t('upload.refresh')}
        </Button>
        {status === DocumentStatus.DRAFT_READY && (
          <Link
            to={`/clinic/drafts?pet=${petId}`}
            className={buttonClasses('primary', 'sm')}
          >
            {t('upload.openDrafts')}
          </Link>
        )}
      </div>
    </div>
  );
}

export function UploadDocumentModal({
  clinicId,
  petId,
  petName,
  onClose,
}: {
  clinicId: string;
  petId: string;
  petName: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('health');
  const queryClient = useQueryClient();
  const formId = useId();
  const fileId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      uploadPetResult(clinicId, petId, file as File, note.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: healthKeys.draftsAll });
      void queryClient.invalidateQueries({ queryKey: healthKeys.pet(petId) });
    },
  });

  const fileCode = submitted ? validateUploadFile(file) : null;
  const noteCode = submitted ? validateUploadNote(note) : null;
  const serverFile =
    isApiError(mutation.error) &&
    mutation.error.field !== undefined &&
    SERVER_FILE_FIELDS.has(mutation.error.field);
  const serverNote =
    isApiError(mutation.error) && mutation.error.field === 'NOTE';
  const fileError = fileCode
    ? translateError(fileCode, i18n)
    : serverFile
      ? translateError(mutation.error, i18n)
      : null;
  const noteError = noteCode
    ? translateError(noteCode, i18n)
    : serverNote
      ? translateError(mutation.error, i18n)
      : null;

  const close = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validateUploadFile(file) || validateUploadNote(note)) return;
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    mutation.mutate();
  };

  return (
    <Modal
      open
      onClose={close}
      title={t('upload.title')}
      className="max-w-lg"
      footer={
        mutation.isSuccess ? (
          <div className="flex justify-end">
            <Button onClick={close}>{t('upload.done')}</Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={close}
              disabled={mutation.isPending}
            >
              {t('upload.cancel')}
            </Button>
            <Button type="submit" form={formId} loading={mutation.isPending}>
              {t('upload.submit')}
            </Button>
          </div>
        )
      }
    >
      <div className="overflow-y-auto px-6 py-5">
        {mutation.isSuccess ? (
          <DocumentProgress
            documentId={mutation.data.documentId}
            uploadedAt={mutation.data.uploadedAt}
            petId={petId}
          />
        ) : (
          <form
            id={formId}
            noValidate
            onSubmit={onSubmit}
            className="space-y-5"
          >
            <Honeypot {...botGuard.honeypot} />
            {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} />}
            {mutation.isError && !serverFile && !serverNote && (
              <ErrorAlert error={mutation.error} />
            )}
            <p className="text-cocoa-700">
              {t('upload.lead', { name: petName })}
            </p>
            <div>
              <label
                htmlFor={fileId}
                className="mb-1.5 block text-sm font-bold"
              >
                {t('upload.file')}
              </label>
              <input
                id={fileId}
                type="file"
                name="file"
                accept={UPLOAD_ACCEPT}
                aria-invalid={fileError ? true : undefined}
                aria-describedby={`${fileId}-hint`}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  if (mutation.isError) mutation.reset();
                }}
                className={cn(
                  'block w-full rounded-xl bg-white text-sm text-cocoa-700 ring-1',
                  'file:mr-4 file:cursor-pointer file:rounded-l-xl file:border-0 file:bg-cream-200 file:px-4 file:py-3 file:font-bold file:text-cocoa-800 hover:file:bg-cream-300',
                  fileError ? 'ring-coral-500' : 'ring-cream-300',
                )}
              />
              {fileError ? (
                <p className="mt-1.5 text-sm font-semibold text-coral-600">
                  {fileError}
                </p>
              ) : (
                <p
                  id={`${fileId}-hint`}
                  className="mt-1.5 text-sm text-cocoa-500"
                >
                  {file
                    ? t('upload.selected', {
                        name: file.name,
                        size: formatBytes(file.size, i18n.language),
                      })
                    : t('upload.fileHint')}
                </p>
              )}
            </div>
            <TextArea
              label={t('upload.note')}
              name="note"
              rows={3}
              maxLength={UPLOAD_NOTE_MAX}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (mutation.isError) mutation.reset();
              }}
              error={noteError}
              hint={t('upload.noteHint')}
            />
            <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-cocoa-600">
              {t('upload.aiNote')}
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
}
