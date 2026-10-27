import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { grantConsent } from '@/api/endpoints/consents';
import { isApiError } from '@/api/errors';
import {
  ConsentStatus,
  type Clinic,
  type Consent,
  type Pet,
} from '@/api/types';
import { Checkbox } from '@/components/form/Checkbox';
import { RadioGroup } from '@/components/form/RadioGroup';
import { TextField } from '@/components/form/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { BuildingIcon, MailIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { CONSENT_SCOPES } from '@/domain/constants';
import { translateError } from '@/i18n/translateError';
import { cn } from '@/lib/cn';
import {
  CONSENT_DURATIONS,
  maxConsentDate,
  type ConsentDuration,
} from '@/lib/consentExpiry';
import { showFlash } from '@/lib/flash';
import { formatDate, formatPhone, todayInBusinessTimeZone } from '@/lib/format';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { PetAvatar } from '../pets/PetAvatar';
import { usePets } from '../pets/queries';
import { usePetLabels } from '../pets/usePetLabels';
import {
  endDateOf,
  initialGrantDetails,
  normalizeClinicCode,
  toGrantRequest,
  validateClinicCode,
  validateGrantDetails,
  type GrantDetailsField,
  type GrantDetailsValues,
} from './consentModel';
import { consentsQueryKey, useClinic, useConsentStatus } from './queries';
import { useConsentLabels } from './useConsentLabels';

function Step({
  number,
  title,
  children,
  action,
}: {
  number: number;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-extrabold text-fg">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm text-accent-ink">
            {number}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function clinicLookupError(error: unknown): string | null {
  if (!isApiError(error)) return null;
  if (error.status === 404) return 'CLINIC_NOT_FOUND';
  if (error.status === 400 && error.field === 'CLINIC_ID') return error.code;
  return null;
}

function ClinicCard({ clinic }: { clinic: Clinic }) {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-start gap-4 rounded-xl bg-bg p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
        <BuildingIcon className="size-6" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="text-base font-extrabold wrap-break-word text-fg">
          {clinic.name}
        </p>
        <p className="mt-1 text-fg-muted">
          {formatPhone(clinic.phone, i18n.language)}
        </p>
        <p className="flex items-center gap-1.5 break-all text-fg-muted">
          <MailIcon className="size-4 shrink-0" />
          {clinic.email}
        </p>
      </div>
    </div>
  );
}

function ClinicStep({
  clinicId,
  onSelect,
  onClear,
}: {
  clinicId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const { t, i18n } = useTranslation('consents');
  const [code, setCode] = useState(clinicId ?? '');
  const [codeError, setCodeError] = useState<string | null>(null);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);
  const clinic = useClinic(clinicId);

  const lookupError = clinic.isError ? clinicLookupError(clinic.error) : null;
  const inactive = clinic.isSuccess && !clinic.data.isActive;
  const fieldCode =
    codeError ?? lookupError ?? (inactive ? 'CLINIC_INACTIVE' : null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateClinicCode(code);
    setCodeError(error);
    if (error) return;
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    onSelect(normalizeClinicCode(code));
  };

  if (clinic.isSuccess && clinic.data.isActive) {
    return (
      <Step
        number={1}
        title={t('grant.clinicTitle')}
        action={
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t('grant.change')}
          </Button>
        }
      >
        <ClinicCard clinic={clinic.data} />
      </Step>
    );
  }

  return (
    <Step number={1} title={t('grant.clinicTitle')}>
      <form noValidate onSubmit={submit} className="space-y-4">
        <Honeypot {...botGuard.honeypot} />
        {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} />}
        {clinic.isError && !lookupError && <ErrorAlert error={clinic.error} />}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <TextField
            label={t('grant.codeLabel')}
            name="clinicCode"
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCodeError(null);
            }}
            hint={t('grant.codeHint')}
            error={fieldCode ? translateError(fieldCode, i18n) : null}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            className="sm:mt-7"
            loading={clinic.isFetching}
          >
            {t('grant.find')}
          </Button>
        </div>
      </form>
    </Step>
  );
}

function PetStep({
  petId,
  onSelect,
}: {
  petId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation('consents');
  const pets = usePets();
  const labels = usePetLabels();

  return (
    <Step number={2} title={t('grant.petTitle')}>
      {pets.isPending && <LoadingBlock />}
      {pets.isError && <ErrorAlert error={pets.error} />}
      {pets.isSuccess &&
        (pets.data.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-fg-muted">{t('grant.noPets')}</p>
            <Link
              to="/panel/pets/new"
              className={buttonClasses('primary', 'sm')}
            >
              {t('grant.addPet')}
            </Link>
          </div>
        ) : (
          <fieldset>
            <legend className="sr-only">{t('grant.petTitle')}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {pets.data.map((pet: Pet) => {
                const checked = pet.id === petId;
                return (
                  <label
                    key={pet.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-xl p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                      checked
                        ? 'bg-accent-tint ring-2 ring-accent light:ring-accent-fg'
                        : 'bg-surface ring-[1.5px] ring-input dark:bg-bg',
                    )}
                  >
                    <input
                      type="radio"
                      name="pet"
                      value={pet.id}
                      checked={checked}
                      onChange={() => onSelect(pet.id)}
                      className="sr-only"
                    />
                    <PetAvatar species={pet.species} />
                    <span className="min-w-0">
                      <span className="block font-extrabold wrap-break-word text-fg">
                        {pet.name}
                      </span>
                      <span className="block text-sm text-fg-muted">
                        {labels.species(pet.species)}
                      </span>
                      <span className="block text-sm wrap-break-word text-fg-muted">
                        {labels.breed(pet.breed)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
    </Step>
  );
}

function serverDetailsError(
  error: unknown,
): { field: GrantDetailsField; code: string } | null {
  if (!isApiError(error)) return null;
  if (error.field === 'SCOPES') return { field: 'scopes', code: error.code };
  if (error.field === 'EXPIRES_AT') {
    return { field: 'endDate', code: error.code };
  }
  if (error.code === 'VALIDATION_ERROR') {
    return { field: 'endDate', code: 'CONSENT_EXPIRY_INVALID' };
  }
  return null;
}

function GrantDetailsForm({
  clinic,
  pet,
  existing,
}: {
  clinic: Clinic;
  pet: Pet;
  existing: Consent;
}) {
  const { t, i18n } = useTranslation('consents');
  const labels = useConsentLabels();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = todayInBusinessTimeZone();
  const [values, setValues] = useState<GrantDetailsValues>(() =>
    initialGrantDetails(existing, today),
  );
  const [submitted, setSubmitted] = useState(false);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const isUpdate = existing.status === ConsentStatus.ACTIVE;
  const hadConsent =
    existing.status === ConsentStatus.REVOKED ||
    existing.status === ConsentStatus.EXPIRED;

  const mutation = useMutation({
    mutationFn: () =>
      grantConsent(toGrantRequest(clinic.id, pet.id, values, today)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consentsQueryKey });
      showFlash(
        isUpdate ? 'consents:grant.updated' : 'consents:grant.granted',
        {
          values: { clinic: clinic.name },
        },
      );
      await navigate('/panel/consents');
    },
  });

  const clientErrors = submitted ? validateGrantDetails(values, today) : {};
  const serverError = serverDetailsError(mutation.error);
  const errorOf = (field: GrantDetailsField) => {
    const code =
      clientErrors[field] ??
      (serverError?.field === field ? serverError.code : undefined);
    return code ? translateError(code, i18n) : null;
  };

  const update = (next: Partial<GrantDetailsValues>) => {
    setValues((current) => ({ ...current, ...next }));
    if (mutation.isError) mutation.reset();
  };

  const toggleScope = (scope: string, checked: boolean) =>
    update({
      scopes: checked
        ? [...values.scopes, scope]
        : values.scopes.filter((item) => item !== scope),
    });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateGrantDetails(values, today)).length > 0) return;
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    mutation.mutate();
  };

  const endDate = endDateOf(values, today);
  const scopesError = errorOf('scopes');
  const endDateError = errorOf('endDate');

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      {(isUpdate || hadConsent) && (
        <p
          role="status"
          className="rounded-xl bg-accent-tint px-5 py-4 text-sm font-semibold text-accent-strong"
        >
          {isUpdate
            ? t('grant.activeNotice', {
                pet: pet.name,
                date: formatDate(existing.expiresAt, i18n.language),
              })
            : t('grant.pastNotice', { pet: pet.name })}
        </p>
      )}

      <Step
        number={3}
        title={t('grant.scopesTitle')}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              update({
                scopes:
                  values.scopes.length === CONSENT_SCOPES.length
                    ? []
                    : [...CONSENT_SCOPES],
              })
            }
          >
            {values.scopes.length === CONSENT_SCOPES.length
              ? t('grant.clearAll')
              : t('grant.selectAll')}
          </Button>
        }
      >
        <fieldset aria-describedby={scopesError ? 'scopes-error' : undefined}>
          <legend className="sr-only">{t('grant.scopesTitle')}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {CONSENT_SCOPES.map((scope) => (
              <Checkbox
                key={scope}
                label={
                  <span className="font-bold text-fg">
                    {labels.scopeLabel(scope)}
                  </span>
                }
                hint={labels.scopeDescription(scope)}
                checked={values.scopes.includes(scope)}
                onChange={(e) => toggleScope(scope, e.target.checked)}
                className="rounded-xl bg-bg p-4"
              />
            ))}
          </div>
          {scopesError && (
            <p
              id="scopes-error"
              role="alert"
              className="mt-3 text-sm font-semibold text-danger"
            >
              {scopesError}
            </p>
          )}
        </fieldset>
      </Step>

      <Step number={4} title={t('grant.durationTitle')}>
        <div className="space-y-4">
          <RadioGroup
            label={t('grant.durationTitle')}
            name="duration"
            value={values.duration}
            columns={3}
            onChange={(value) => update({ duration: value as ConsentDuration })}
            options={CONSENT_DURATIONS.map((duration) => ({
              value: duration,
              label: t(`grant.durations.${duration}`),
            }))}
            hint={t('grant.maxNote')}
          />
          {values.duration === 'custom' && (
            <TextField
              label={t('grant.endDate')}
              name="customDate"
              type="date"
              min={today}
              max={maxConsentDate(today)}
              value={values.customDate}
              onChange={(e) => update({ customDate: e.target.value })}
              error={endDateError}
              className="sm:max-w-xs"
            />
          )}
          {values.duration !== 'custom' && endDateError && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {endDateError}
            </p>
          )}
          {endDate && !endDateError && (
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ok">
              <Badge tone="sage">{formatDate(endDate, i18n.language)}</Badge>
              {t('grant.endsOn', { date: formatDate(endDate, i18n.language) })}
            </p>
          )}
        </div>
      </Step>

      <Honeypot {...botGuard.honeypot} />
      {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} reveal />}
      {mutation.isError && !serverError && (
        <ErrorAlert error={mutation.error} reveal />
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link to="/panel/consents" className={buttonClasses('ghost', 'md')}>
          {t('grant.cancel')}
        </Link>
        <Button type="submit" loading={mutation.isPending}>
          {isUpdate ? t('grant.submitUpdate') : t('grant.submit')}
        </Button>
      </div>
    </form>
  );
}

function DetailsLoader({ clinic, pet }: { clinic: Clinic; pet: Pet }) {
  const { t } = useTranslation('consents');
  const status = useConsentStatus(clinic.id, pet.id);

  if (status.isError) return <ErrorAlert error={status.error} />;
  if (!status.isSuccess) {
    return (
      <div role="status" className="text-sm text-fg-muted">
        {t('grant.checkingExisting')}
      </div>
    );
  }
  return <GrantDetailsForm clinic={clinic} pet={pet} existing={status.data} />;
}

export function GrantConsentPage() {
  const { t } = useTranslation('consents');
  useDocumentTitle(t('grant.pageTitle'));
  const [searchParams, setSearchParams] = useSearchParams();
  const clinicParam = searchParams.get('clinic');
  const petParam = searchParams.get('pet');
  const clinicId =
    clinicParam && !validateClinicCode(clinicParam)
      ? normalizeClinicCode(clinicParam)
      : null;
  const clinic = useClinic(clinicId);
  const pets = usePets();
  const pet = pets.data?.find((item) => item.id === petParam) ?? null;

  const setParam = (key: 'clinic' | 'pet', value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const readyClinic =
    clinic.isSuccess && clinic.data.isActive ? clinic.data : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t('grant.title')} lead={t('grant.lead')} />
      <ClinicStep
        key={clinicId ?? 'none'}
        clinicId={clinicId}
        onSelect={(id) => setParam('clinic', id)}
        onClear={() => setParam('clinic', null)}
      />
      <PetStep petId={pet?.id ?? null} onSelect={(id) => setParam('pet', id)} />
      {readyClinic && pet && (
        <DetailsLoader
          key={`${readyClinic.id}:${pet.id}`}
          clinic={readyClinic}
          pet={pet}
        />
      )}
    </div>
  );
}
