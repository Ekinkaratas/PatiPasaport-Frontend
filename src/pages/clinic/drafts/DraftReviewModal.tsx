import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reviewDraft } from '@/api/endpoints/records';
import { isApiError } from '@/api/errors';
import type { DraftReview, ReviewDraftRequest } from '@/api/types';
import { focusFirstInvalid } from '@/components/form/formUtils';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { translateError } from '@/i18n/translateError';
import { showFlash } from '@/lib/flash';
import { formatDate, todayInBusinessTimeZone } from '@/lib/format';
import { DocumentActions } from '../../health/DocumentActions';
import { healthKeys } from '../../health/queries';
import { RecordContentForm } from '../../health/RecordContentForm';
import { RecordDetails, RecordTypeBadge } from '../../health/RecordDetails';
import {
  isApprovableAsIs,
  RECORD_SERVER_FIELDS,
  recordFormFrom,
  toRecordContent,
  validateRecordForm,
  type RecordFormValues,
} from '../../health/recordModel';
import { clinicKeys } from '../queries';
import { REVIEW_NOTE_MAX, validateReviewNote } from './draftsModel';

type Mode = 'review' | 'edit';
type Action = 'approve' | 'approveEdited' | 'reject';

export function DraftReviewModal({
  draft,
  petName,
  onClose,
}: {
  draft: DraftReview;
  petName: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('health');
  const queryClient = useQueryClient();
  const formId = useId();
  const today = todayInBusinessTimeZone();
  const [mode, setMode] = useState<Mode>('review');
  const [values, setValues] = useState<RecordFormValues>(() =>
    recordFormFrom(draft.proposal, today),
  );
  const [note, setNote] = useState('');
  const [attempt, setAttempt] = useState<Action | null>(null);
  const approvable = isApprovableAsIs(draft.proposal, today);

  const mutation = useMutation({
    mutationFn: (request: ReviewDraftRequest) => reviewDraft(draft.id, request),
    onSuccess: async (_data, request) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: healthKeys.all }),
        queryClient.invalidateQueries({ queryKey: clinicKeys.all }),
      ]);
      showFlash(
        request.approved
          ? 'health:review.approvedDone'
          : 'health:review.rejectedDone',
        {
          values: { name: petName },
          tone: request.approved ? 'success' : 'info',
        },
      );
      onClose();
    },
  });

  const recordErrors =
    mode === 'edit' && attempt === 'approveEdited'
      ? validateRecordForm(values, today)
      : {};
  const serverField =
    isApiError(mutation.error) && mutation.error.field
      ? RECORD_SERVER_FIELDS[mutation.error.field]
      : undefined;
  const errors =
    serverField && isApiError(mutation.error)
      ? { [serverField]: mutation.error.code, ...recordErrors }
      : recordErrors;
  const noteCode = attempt
    ? validateReviewNote(note, attempt !== 'reject')
    : null;
  const serverNote =
    isApiError(mutation.error) && mutation.error.field === 'REVIEW_NOTE';
  const noteError = noteCode
    ? translateError(noteCode, i18n)
    : serverNote
      ? translateError(mutation.error, i18n)
      : null;
  const conflict = isApiError(mutation.error) && mutation.error.status === 409;
  const genericInvalid =
    isApiError(mutation.error) &&
    mutation.error.status === 400 &&
    !mutation.error.field;
  const otherError =
    mutation.isError &&
    !serverField &&
    !serverNote &&
    !conflict &&
    !genericInvalid;

  const submit = (action: Action) => {
    setAttempt(action);
    if (validateReviewNote(note, action !== 'reject')) return;
    const reviewNote = note.trim() || undefined;
    if (action === 'reject') {
      mutation.mutate({ approved: false, reviewNote });
      return;
    }
    if (action === 'approve') {
      mutation.mutate({ approved: true, reviewNote });
      return;
    }
    if (Object.keys(validateRecordForm(values, today)).length > 0) return;
    mutation.mutate({
      approved: true,
      reviewNote,
      editedContent: toRecordContent(values),
    });
  };

  const onEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempt('approveEdited');
    if (Object.keys(validateRecordForm(values, today)).length > 0) {
      focusFirstInvalid(event.currentTarget);
      return;
    }
    submit('approveEdited');
  };

  const close = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const source = draft.sourceFiles[0];

  return (
    <Modal
      open
      onClose={close}
      title={t('review.title', { name: petName })}
      className="max-w-3xl"
      footer={
        mode === 'review' ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="danger"
              loading={mutation.isPending && attempt === 'reject'}
              disabled={mutation.isPending || conflict}
              onClick={() => submit('reject')}
            >
              {t('review.reject')}
            </Button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                variant="secondary"
                disabled={mutation.isPending || conflict}
                onClick={() => {
                  setMode('edit');
                  setAttempt(null);
                  mutation.reset();
                }}
              >
                {t('review.edit')}
              </Button>
              <Button
                loading={mutation.isPending && attempt === 'approve'}
                disabled={!approvable || mutation.isPending || conflict}
                onClick={() => submit('approve')}
              >
                {t('review.approve')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => {
                setMode('review');
                setAttempt(null);
                mutation.reset();
              }}
            >
              {t('review.backToProposal')}
            </Button>
            <Button
              type="submit"
              form={formId}
              loading={mutation.isPending}
              disabled={conflict}
            >
              {t('review.approveEdited')}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5 overflow-y-auto px-6 py-5">
        {conflict && (
          <p
            role="alert"
            className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700 ring-1 ring-coral-100"
          >
            {t('review.conflict')}
          </p>
        )}
        {genericInvalid && (
          <p
            role="alert"
            className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700 ring-1 ring-coral-100"
          >
            {t('form.serverInvalid')}
          </p>
        )}
        {otherError && <ErrorAlert error={mutation.error} />}
        <dl className="grid gap-3 rounded-2xl bg-cream-100 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-cocoa-500">
              {t('drafts.source')}
            </dt>
            <dd className="truncate font-bold text-cocoa-800">
              {source?.originalName || '—'}
            </dd>
            {source?.documentId && (
              <DocumentActions
                documentId={source.documentId}
                fileName={source.originalName || source.documentId}
                className="-ml-3 mt-1"
              />
            )}
          </div>
          <div>
            <dt className="font-semibold text-cocoa-500">
              {t('drafts.confidence')}
            </dt>
            <dd className="font-bold text-cocoa-800">
              {new Intl.NumberFormat(
                i18n.language === 'tr' ? 'tr-TR' : 'en-GB',
                {
                  style: 'percent',
                  maximumFractionDigits: 0,
                },
              ).format(draft.confidence || 0)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cocoa-500">
              {t('drafts.model')}
            </dt>
            <dd className="truncate font-bold text-cocoa-800">
              {draft.modelVersion || '—'}
            </dd>
          </div>
        </dl>

        {mode === 'review' ? (
          <>
            {draft.proposal ? (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <RecordTypeBadge type={draft.proposal.type} />
                  <h3 className="text-lg font-extrabold text-cocoa-900">
                    {draft.proposal.title || t('drafts.untitled')}
                  </h3>
                </div>
                <p className="text-sm text-cocoa-500">
                  {draft.proposal.recordedAt
                    ? formatDate(draft.proposal.recordedAt, i18n.language, {
                        dateStyle: 'medium',
                      })
                    : '—'}
                </p>
                <RecordDetails content={draft.proposal} />
              </section>
            ) : (
              <p className="text-cocoa-600">{t('drafts.noProposal')}</p>
            )}
            {!approvable && (
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">
                {t('review.needsEdit')}
              </p>
            )}
            <TextField
              label={t('review.note')}
              name="reviewNote"
              autoComplete="off"
              maxLength={REVIEW_NOTE_MAX}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (mutation.isError) mutation.reset();
              }}
              error={noteError}
              hint={t('review.noteHint')}
            />
          </>
        ) : (
          <form
            id={formId}
            noValidate
            onSubmit={onEditSubmit}
            className="space-y-6"
          >
            <RecordContentForm
              values={values}
              errors={errors}
              today={today}
              onChange={(next) => {
                setValues(next);
                if (mutation.isError) mutation.reset();
              }}
            />
            <TextField
              label={t('review.note')}
              name="reviewNote"
              autoComplete="off"
              maxLength={REVIEW_NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              error={noteError}
              hint={t('review.noteHintEdit')}
            />
          </form>
        )}
      </div>
    </Modal>
  );
}
