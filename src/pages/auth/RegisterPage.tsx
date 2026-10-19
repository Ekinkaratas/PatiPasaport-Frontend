import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { register } from '@/api/endpoints/auth';
import { startSession } from '@/auth/session';
import { Checkbox } from '@/components/form/Checkbox';
import {
  focusFirstInvalid,
  splitServerError,
} from '@/components/form/formUtils';
import { PasswordChecklist } from '@/components/form/PasswordChecklist';
import { PasswordField } from '@/components/form/PasswordField';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { CONTACT_EMAIL } from '@/config/site';
import {
  normalizeEmail,
  normalizeWhitespace,
  validateEmail,
  validateFullName,
  validateMobilePhone,
  validateNewPassword,
} from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { KvkkModal } from '@/legal/KvkkModal';
import { normalizeTrMobilePhone } from '@/lib/format';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { AuthCard } from './AuthCard';

type Field =
  'fullName' | 'email' | 'phone' | 'password' | 'passwordConfirm' | 'kvkk';

type Values = Record<Exclude<Field, 'kvkk'>, string>;

function validate(values: Values, kvkkAccepted: boolean) {
  const errors: Partial<Record<Field, string>> = {};
  const set = (field: Field, code: string | null) => {
    if (code) errors[field] = code;
  };
  set('fullName', validateFullName(values.fullName));
  set('email', validateEmail(values.email));
  set('phone', validateMobilePhone(values.phone));
  set('password', validateNewPassword(values.password));
  if (!values.passwordConfirm) {
    set('passwordConfirm', 'PASSWORD_NOT_EMPTY');
  } else if (values.passwordConfirm !== values.password) {
    set('passwordConfirm', 'PASSWORD_CONFIRM_MISMATCH');
  }
  if (!kvkkAccepted) set('kvkk', 'KVKK_NOT_ACCEPTED');
  return errors;
}

export function RegisterPage() {
  const { t, i18n } = useTranslation('auth');
  useDocumentTitle(t('register.pageTitle'));
  const navigate = useNavigate();

  const [values, setValues] = useState<Values>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [kvkkRead, setKvkkRead] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [kvkkOpen, setKvkkOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverFieldError, setServerFieldError] = useState<{
    field: Field;
    code: string;
  } | null>(null);

  const botGuard = useBotGuard({ minFillMs: 3000 });
  const [blocked, setBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async (tokens) => {
      startSession(tokens);
      await navigate('/panel', { replace: true });
    },
    onError: (error) => {
      setServerFieldError(
        splitServerError<Field>(
          error,
          {
            NAME: 'fullName',
            EMAIL: 'email',
            PHONE: 'phone',
            PASSWORD: 'password',
          },
          { EMAIL_ALREADY_EXISTS: 'email', PHONE_ALREADY_EXISTS: 'phone' },
        ),
      );
    },
  });

  const clientErrors = submitted ? validate(values, kvkkAccepted) : {};
  const fieldError = (field: Field): string | null => {
    const code =
      clientErrors[field] ??
      (serverFieldError?.field === field ? serverFieldError.code : undefined);
    return code ? translateError(code, i18n) : null;
  };
  const generalError =
    mutation.isError && !serverFieldError ? mutation.error : null;

  const bind = (field: keyof Values) => ({
    name: field,
    value: values[field],
    error: fieldError(field),
    onChange: (e: { target: { value: string } }) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      if (serverFieldError?.field === field) setServerFieldError(null);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values, kvkkAccepted)).length > 0) {
      focusFirstInvalid(event.currentTarget);
      return;
    }
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    setServerFieldError(null);
    mutation.mutate({
      fullName: normalizeWhitespace(values.fullName),
      email: normalizeEmail(values.email),
      phone: normalizeTrMobilePhone(values.phone),
      password: values.password,
    });
  };

  const onKvkkChange = () => {
    if (!kvkkRead) {
      setKvkkOpen(true);
      return;
    }
    setKvkkAccepted((accepted) => !accepted);
  };

  return (
    <AuthCard
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <>
          <p>
            {t('register.hasAccount')}{' '}
            <Link
              to="/login"
              className="font-bold text-brand-700 hover:underline"
            >
              {t('register.loginLink')}
            </Link>
          </p>
          <p className="mt-2 text-cocoa-500">
            {t('register.clinicNote', { email: CONTACT_EMAIL })}
          </p>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-5">
        <Honeypot {...botGuard.honeypot} />
        {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} reveal />}
        {generalError && <ErrorAlert error={generalError} reveal />}

        <TextField
          label={t('fields.fullName')}
          autoComplete="name"
          placeholder={t('placeholders.fullName')}
          hint={t('hints.fullName')}
          maxLength={64}
          required
          {...bind('fullName')}
        />
        <TextField
          label={t('fields.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('placeholders.email')}
          maxLength={254}
          required
          {...bind('email')}
        />
        <TextField
          label={t('fields.phone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={t('placeholders.phone')}
          hint={t('hints.phone')}
          maxLength={17}
          required
          {...bind('phone')}
        />
        <div className="space-y-3">
          <PasswordField
            label={t('fields.password')}
            autoComplete="new-password"
            maxLength={72}
            required
            {...bind('password')}
          />
          <PasswordChecklist value={values.password} />
        </div>
        <PasswordField
          label={t('fields.passwordConfirm')}
          autoComplete="new-password"
          maxLength={72}
          required
          {...bind('passwordConfirm')}
        />

        <Checkbox
          checked={kvkkAccepted}
          onChange={onKvkkChange}
          error={fieldError('kvkk')}
          hint={kvkkRead ? t('register.kvkkRead') : t('register.kvkkMustRead')}
          label={
            <>
              {t('register.kvkkLabelBefore')}
              <button
                type="button"
                onClick={() => setKvkkOpen(true)}
                className="font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                {t('register.kvkkLink')}
              </button>
              {t('register.kvkkLabelAfter')}
            </>
          }
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={mutation.isPending}
        >
          {t('register.submit')}
        </Button>
      </form>

      <KvkkModal
        open={kvkkOpen}
        onClose={() => setKvkkOpen(false)}
        onAcknowledge={() => {
          setKvkkRead(true);
          setKvkkAccepted(true);
          setKvkkOpen(false);
        }}
      />
    </AuthCard>
  );
}
