import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { createRecord } from '@/api/endpoints/records';
import { isApiError } from '@/api/errors';
import { focusFirstInvalid } from '@/components/form/formUtils';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ArrowLeftIcon, LockIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { showFlash } from '@/lib/flash';
import { todayInBusinessTimeZone } from '@/lib/format';
import { isUuidV4 } from '@/lib/ids';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { canWriteRecords } from '../../health/healthAccess';
import { healthKeys } from '../../health/queries';
import { RecordContentForm } from '../../health/RecordContentForm';
import {
  emptyRecordForm,
  RECORD_SERVER_FIELDS,
  toRecordContent,
  validateRecordForm,
  type RecordFormValues,
} from '../../health/recordModel';
import { useClinicAccount } from '../clinicContext';
import {
  clinicKeys,
  isPatientNotFound,
  useClinicConsentFor,
  usePatientOverview,
} from '../queries';

export function RecordCreatePage() {
  const { t } = useTranslation('health');
  useDocumentTitle(t('create.pageTitle'));
  const { petId = '' } = useParams();
  const clinic = useClinicAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = todayInBusinessTimeZone();
  const overview = usePatientOverview(clinic.id, petId);
  const consent = useClinicConsentFor(petId);
  const [values, setValues] = useState<RecordFormValues>(() =>
    emptyRecordForm(today),
  );
  const [submitted, setSubmitted] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);
  const back = `/clinic/patients/${petId}`;

  const mutation = useMutation({
    mutationFn: () => createRecord(petId, { content: toRecordContent(values) }),
    onSuccess: async ({ record }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: healthKeys.pet(petId) }),
        queryClient.invalidateQueries({ queryKey: clinicKeys.all }),
      ]);
      showFlash('health:create.done', { values: { title: record.title } });
      await navigate(back);
    },
  });

  if (
    !isUuidV4(petId) ||
    (overview.isError && isPatientNotFound(overview.error))
  ) {
    return (
      <div className="space-y-4">
        <ErrorAlert error="NOT_FOUND" />
        <Link to="/clinic/patients" className="font-bold text-brand-700">
          {t('create.backToPatients')}
        </Link>
      </div>
    );
  }
  if (overview.isPending || consent.isPending) return <LoadingBlock />;
  if (overview.isError) return <ErrorAlert error={overview.error} />;

  const writable = consent.data ? canWriteRecords(consent.data.scopes) : false;
  const clientErrors = submitted ? validateRecordForm(values, today) : {};
  const serverField =
    isApiError(mutation.error) && mutation.error.field
      ? RECORD_SERVER_FIELDS[mutation.error.field]
      : undefined;
  const errors =
    serverField && isApiError(mutation.error)
      ? { [serverField]: mutation.error.code, ...clientErrors }
      : clientErrors;
  const genericInvalid =
    isApiError(mutation.error) &&
    mutation.error.status === 400 &&
    !mutation.error.field;

  const update = (next: RecordFormValues) => {
    setValues(next);
    if (mutation.isError) mutation.reset();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateRecordForm(values, today)).length > 0) {
      focusFirstInvalid(event.currentTarget);
      return;
    }
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Link
        to={back}
        className="inline-flex items-center gap-2 text-sm font-bold text-cocoa-600 hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        {t('create.back', { name: overview.data.pet.name })}
      </Link>
      <PageHeader
        title={t('create.title')}
        lead={t('create.lead', { name: overview.data.pet.name })}
      />
      {!writable ? (
        <div className="flex items-start gap-3 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60">
          <LockIcon className="mt-0.5 size-5 shrink-0 text-cocoa-500" />
          <p className="text-cocoa-700">{t('create.noWrite')}</p>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={onSubmit}
          className="space-y-6 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60 sm:p-8"
        >
          <Honeypot {...botGuard.honeypot} />
          {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} reveal />}
          {genericInvalid && (
            <p
              role="alert"
              className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700 ring-1 ring-coral-100"
            >
              {t('form.serverInvalid')}
            </p>
          )}
          {mutation.isError && !serverField && !genericInvalid && (
            <ErrorAlert error={mutation.error} reveal />
          )}
          <RecordContentForm
            values={values}
            errors={errors}
            today={today}
            onChange={update}
          />
          <div className="flex flex-col-reverse gap-3 border-t border-cream-300 pt-6 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => void navigate(back)}
              disabled={mutation.isPending}
            >
              {t('create.cancel')}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {t('create.submit')}
            </Button>
          </div>
          <p className="text-sm text-cocoa-500">{t('create.permanentNote')}</p>
        </form>
      )}
    </div>
  );
}
