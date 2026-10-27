import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { login } from '@/api/endpoints/auth';
import { safeRedirectPath } from '@/auth/hooks';
import { LOGOUT_REASON, startSession } from '@/auth/session';
import { useSession } from '@/auth/useSession';
import { Checkbox } from '@/components/form/Checkbox';
import { PasswordField } from '@/components/form/PasswordField';
import {
  focusFirstInvalid,
  splitServerError,
} from '@/components/form/formUtils';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  normalizeEmail,
  validateEmail,
  validateLoginPassword,
} from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { AuthCard } from './AuthCard';

type Field = 'email' | 'password';

function validate(values: Record<Field, string>) {
  const errors: Partial<Record<Field, string>> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  const password = validateLoginPassword(values.password);
  if (password) errors.password = password;
  return errors;
}

export function LoginPage() {
  const { t, i18n } = useTranslation('auth');
  useDocumentTitle(t('login.pageTitle'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = useSession();

  const [values, setValues] = useState<Record<Field, string>>({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverFieldError, setServerFieldError] = useState<{
    field: Field;
    code: string;
  } | null>(null);

  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (tokens) => {
      startSession(tokens);
      await navigate(safeRedirectPath(searchParams.get('next')), {
        replace: true,
      });
    },
    onError: (error) => {
      setServerFieldError(
        splitServerError<Field>(error, {
          EMAIL: 'email',
          PASSWORD: 'password',
        }),
      );
    },
  });

  const clientErrors = submitted ? validate(values) : {};
  const fieldError = (field: Field): string | null => {
    const code =
      clientErrors[field] ??
      (serverFieldError?.field === field ? serverFieldError.code : undefined);
    return code ? translateError(code, i18n) : null;
  };
  const generalError =
    mutation.isError && !serverFieldError ? mutation.error : null;

  const update = (field: Field) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (serverFieldError?.field === field) setServerFieldError(null);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values)).length > 0) {
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
      email: normalizeEmail(values.email),
      password: values.password,
      rememberMe,
    });
  };

  const endedNotice =
    session.endReason === 'ACCOUNT_DISABLED'
      ? t('login.accountDisabled')
      : session.endReason && session.endReason !== LOGOUT_REASON
        ? t('login.sessionEnded')
        : null;

  return (
    <AuthCard
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <>
          <p>
            {t('login.noAccount')}{' '}
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center font-bold text-fg underline underline-offset-2 transition-colors duration-150 hover:text-accent-fg"
            >
              {t('login.registerLink')}
            </Link>
          </p>
          <p className="mt-2">{t('login.clinicNote')}</p>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-5">
        {endedNotice && !mutation.isPending && !mutation.isError && (
          <p
            role="status"
            className="rounded-xl bg-accent-tint px-4 py-3 text-sm font-semibold text-accent-strong"
          >
            {endedNotice}
          </p>
        )}
        <Honeypot {...botGuard.honeypot} />
        {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} reveal />}
        {generalError && <ErrorAlert error={generalError} reveal />}

        <TextField
          label={t('fields.email')}
          type="email"
          name="email"
          autoComplete="username"
          maxLength={254}
          inputMode="email"
          placeholder={t('placeholders.email')}
          value={values.email}
          onChange={(e) => update('email')(e.target.value)}
          error={fieldError('email')}
          required
        />
        <PasswordField
          label={t('fields.password')}
          name="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => update('password')(e.target.value)}
          error={fieldError('password')}
          maxLength={72}
          required
        />
        <Checkbox
          label={t('login.rememberMe')}
          hint={t('login.rememberMeHint')}
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={mutation.isPending}
        >
          {t('login.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
