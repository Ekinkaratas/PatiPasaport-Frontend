import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { updateMe } from '@/api/endpoints/users';
import { isApiError } from '@/api/errors';
import type { GetMeResponse, UpdateMeRequest } from '@/api/types';
import { meQueryKey } from '@/auth/hooks';
import { focusFirstInvalid } from '@/components/form/formUtils';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  FULL_NAME_MAX_LENGTH,
  normalizeWhitespace,
  validateFullName,
  validateMobilePhone,
} from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { formatDate, formatPhone, normalizeTrMobilePhone } from '@/lib/format';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useOwnerProfile } from '../ownerContext';
import { DeactivateAccountModal } from './DeactivateAccountModal';

type Field = 'fullName' | 'phone';

const SERVER_FIELDS: Record<string, Field> = {
  NAME: 'fullName',
  PHONE: 'phone',
};

function serverFieldError(
  error: unknown,
): { field: Field; code: string } | null {
  if (!isApiError(error)) return null;
  if (error.code === 'CONFLICT' || error.code === 'PHONE_ALREADY_EXISTS') {
    return { field: 'phone', code: 'PHONE_ALREADY_EXISTS' };
  }
  const field = error.field ? SERVER_FIELDS[error.field] : undefined;
  return field ? { field, code: error.code } : null;
}

function validate(values: Record<Field, string>) {
  const errors: Partial<Record<Field, string>> = {};
  const fullName = validateFullName(values.fullName);
  if (fullName) errors.fullName = fullName;
  const phone = validateMobilePhone(values.phone);
  if (phone) errors.phone = phone;
  return errors;
}

function diff(values: Record<Field, string>, profile: GetMeResponse) {
  const request: UpdateMeRequest = {};
  const fullName = normalizeWhitespace(values.fullName);
  if (fullName !== profile.fullName) request.fullName = fullName;
  const phone = normalizeTrMobilePhone(values.phone);
  if (phone !== profile.phone) request.phone = phone;
  return request;
}

export function ProfilePage() {
  const { t, i18n } = useTranslation('profile');
  useDocumentTitle(t('pageTitle'));
  const profile = useOwnerProfile();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<Record<Field, string>>({
    fullName: profile.fullName,
    phone: formatPhone(profile.phone, 'tr'),
  });
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<'saved' | 'noChanges' | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: ({ user }) => {
      queryClient.setQueryData<GetMeResponse>(meQueryKey(user.userId), (old) =>
        old ? { ...old, ...user } : old,
      );
      setMessage('saved');
    },
  });

  const clientErrors = submitted ? validate(values) : {};
  const serverField = serverFieldError(mutation.error);
  const errorOf = (field: Field) => {
    const code =
      clientErrors[field] ??
      (serverField?.field === field ? serverField.code : undefined);
    return code ? translateError(code, i18n) : null;
  };

  const update = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setMessage(null);
    if (mutation.isError) mutation.reset();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setMessage(null);
    if (Object.keys(validate(values)).length > 0) {
      focusFirstInvalid(event.currentTarget);
      return;
    }
    const request = diff(values, profile);
    if (Object.keys(request).length === 0) {
      setMessage('noChanges');
      return;
    }
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    mutation.mutate(request);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        lead={t('lead')}
        eyebrow={
          <p className="mb-1 text-sm font-semibold text-fg-muted">
            {t('memberSince', {
              date: formatDate(profile.createdAt, i18n.language),
            })}
          </p>
        }
      />

      <form
        noValidate
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8"
      >
        <h2 className="text-lg font-extrabold text-fg">{t('personalTitle')}</h2>
        <Honeypot {...botGuard.honeypot} />
        {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} reveal />}
        {mutation.isError && !serverField && (
          <ErrorAlert error={mutation.error} reveal />
        )}
        {message && (
          <p
            role="status"
            className={
              message === 'saved'
                ? 'rounded-xl bg-ok-tint px-4 py-3 text-sm font-semibold text-ok'
                : 'rounded-xl bg-accent-tint px-4 py-3 text-sm font-semibold text-accent-strong'
            }
          >
            {t(message)}
          </p>
        )}

        <TextField
          label={t('email')}
          value={profile.email}
          hint={t('emailHint')}
          disabled
          readOnly
        />
        <TextField
          label={t('fullName')}
          name="fullName"
          autoComplete="name"
          maxLength={FULL_NAME_MAX_LENGTH}
          value={values.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          error={errorOf('fullName')}
          required
        />
        <TextField
          label={t('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={17}
          value={values.phone}
          onChange={(e) => update('phone', e.target.value)}
          error={errorOf('phone')}
          required
        />
        <div className="flex justify-end border-t border-line pt-6">
          <Button type="submit" loading={mutation.isPending}>
            {t('save')}
          </Button>
        </div>
      </form>

      <section className="rounded-2xl bg-danger-tint p-6 sm:p-8">
        <h2 className="text-lg font-extrabold text-danger">
          {t('danger.title')}
        </h2>
        <p className="mt-1 text-fg">{t('danger.body')}</p>
        <Button
          variant="danger"
          className="mt-5"
          onClick={() => setDeactivateOpen(true)}
        >
          {t('danger.button')}
        </Button>
      </section>

      <DeactivateAccountModal
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
      />
    </div>
  );
}
