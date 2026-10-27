import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/api/errors';
import { PetSex, type Pet } from '@/api/types';
import { Checkbox } from '@/components/form/Checkbox';
import { focusFirstInvalid } from '@/components/form/formUtils';
import { RadioGroup } from '@/components/form/RadioGroup';
import { Select } from '@/components/form/Select';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PET_SPECIES } from '@/domain/constants';
import { PET_NAME_MAX_LENGTH } from '@/domain/validation';
import { translateError } from '@/i18n/translateError';
import { todayInBusinessTimeZone } from '@/lib/format';
import {
  breedsOf,
  validatePetForm,
  type BirthMode,
  type PetFormErrors,
  type PetFormField,
  type PetFormMode,
  type PetFormValues,
} from './petFormModel';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { usePetLabels } from './usePetLabels';

const SERVER_FIELDS: Record<string, PetFormField> = {
  PET_NAME: 'name',
  SPECIES: 'species',
  BREED: 'breed',
  SEX: 'sex',
  BIRTH_DATE: 'birthDate',
  IS_BIRTH_DATE_ESTIMATED: 'birthDate',
  CHIP_NUMBER: 'chipNumber',
};

function serverFieldError(
  error: unknown,
): { field: PetFormField; code: string } | null {
  if (!isApiError(error)) return null;
  if (error.code === 'CONFLICT') {
    return { field: 'chipNumber', code: 'CHIP_NUMBER_TAKEN' };
  }
  const field = error.field ? SERVER_FIELDS[error.field] : undefined;
  return field ? { field, code: error.code } : null;
}

export interface PetFormProps {
  mode: PetFormMode;
  initialValues: PetFormValues;
  original?: Pet;
  submitting: boolean;
  submitError: unknown;
  notice?: string | null;
  submitLabel: string;
  onSubmit: (values: PetFormValues, today: string) => void;
  onCancel: () => void;
}

export function PetForm({
  mode,
  initialValues,
  original,
  submitting,
  submitError,
  notice,
  submitLabel,
  onSubmit,
  onCancel,
}: PetFormProps) {
  const { t, i18n } = useTranslation('pets');
  const labels = usePetLabels();
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [dismissedError, setDismissedError] = useState<unknown>(null);
  const today = todayInBusinessTimeZone();
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const clientErrors: PetFormErrors = submitted
    ? validatePetForm(values, today, mode, original)
    : {};
  const activeServerError =
    submitError && submitError !== dismissedError ? submitError : null;
  const serverField = serverFieldError(activeServerError);

  const errorOf = (field: PetFormField) => {
    const code =
      clientErrors[field] ??
      (serverField?.field === field ? serverField.code : undefined);
    return code ? translateError(code, i18n) : null;
  };

  const update = <K extends keyof PetFormValues>(
    key: K,
    value: PetFormValues[K],
  ) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === 'species' && value !== current.species) next.breed = '';
      return next;
    });
    if (activeServerError) setDismissedError(activeServerError);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setDismissedError(null);
    const errors = validatePetForm(values, today, mode, original);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(event.currentTarget);
      return;
    }
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    onSubmit(values, today);
  };

  const breedOptions = breedsOf(values.species).map((code) => ({
    value: code,
    label: labels.breed(code),
  }));

  const birthModes: Array<{ value: BirthMode; label: string }> = [
    { value: 'exact', label: t('form.birthExact') },
    { value: 'estimated', label: t('form.birthEstimated') },
    ...(mode === 'create' || !original?.birthDate
      ? [{ value: 'unknown' as const, label: t('form.birthUnknown') }]
      : []),
  ];

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8"
    >
      <Honeypot {...botGuard.honeypot} />
      {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} reveal />}
      {activeServerError && !serverField ? (
        <ErrorAlert error={activeServerError} reveal />
      ) : null}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-accent-tint px-4 py-3 text-sm font-semibold text-accent-strong"
        >
          {notice}
        </p>
      )}

      <TextField
        label={t('form.name')}
        name="name"
        placeholder={t('form.namePlaceholder')}
        maxLength={PET_NAME_MAX_LENGTH}
        autoComplete="off"
        value={values.name}
        onChange={(e) => update('name', e.target.value)}
        error={errorOf('name')}
        required
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {mode === 'create' ? (
          <Select
            label={t('form.species')}
            name="species"
            placeholder={t('form.speciesPlaceholder')}
            options={PET_SPECIES.map((code) => ({
              value: code,
              label: labels.species(code),
            }))}
            value={values.species}
            onChange={(e) => update('species', e.target.value)}
            error={errorOf('species')}
            required
          />
        ) : (
          <TextField
            label={t('form.species')}
            value={labels.species(values.species)}
            disabled
            readOnly
          />
        )}
        <Select
          label={t('form.breed')}
          name="breed"
          placeholder={
            values.species
              ? t('form.breedPlaceholder')
              : t('form.breedNeedsSpecies')
          }
          options={breedOptions}
          value={values.breed}
          onChange={(e) => update('breed', e.target.value)}
          disabled={!values.species}
          error={errorOf('breed')}
          required
        />
      </div>

      {mode === 'create' ? (
        <RadioGroup
          label={t('form.sex')}
          name="sex"
          value={values.sex}
          onChange={(value) => update('sex', value)}
          options={[PetSex.MALE, PetSex.FEMALE].map((value) => ({
            value: String(value),
            label: labels.sex(value),
          }))}
          error={errorOf('sex')}
          hint={t('form.fixedAfterCreate')}
        />
      ) : (
        <TextField
          label={t('form.sex')}
          value={labels.sex(Number(values.sex))}
          hint={t('form.fixedAfterCreate')}
          disabled
          readOnly
        />
      )}

      <div className="space-y-4 rounded-xl bg-bg p-5">
        <RadioGroup
          label={t('form.birth')}
          name="birthMode"
          value={values.birthMode}
          onChange={(value) => update('birthMode', value as BirthMode)}
          options={birthModes}
          columns={birthModes.length === 3 ? 3 : 2}
          hint={
            mode === 'edit' && original?.birthDate
              ? t('form.birthLocked')
              : undefined
          }
          error={
            values.birthMode === 'unknown' ? errorOf('birthDate') : undefined
          }
        />
        {values.birthMode === 'exact' && (
          <TextField
            label={t('form.birthDate')}
            name="birthDate"
            type="date"
            max={today}
            value={values.birthDate}
            onChange={(e) => update('birthDate', e.target.value)}
            error={errorOf('birthDate')}
            className="sm:max-w-xs"
            required
          />
        )}
        {values.birthMode === 'estimated' && (
          <div>
            <div className="grid max-w-sm grid-cols-2 gap-4">
              <TextField
                label={t('form.ageYears')}
                name="ageYears"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={values.ageYears}
                onChange={(e) => update('ageYears', e.target.value)}
                invalid={Boolean(errorOf('age'))}
              />
              <TextField
                label={t('form.ageMonths')}
                name="ageMonths"
                type="number"
                inputMode="numeric"
                min={0}
                max={11}
                value={values.ageMonths}
                onChange={(e) => update('ageMonths', e.target.value)}
                invalid={Boolean(errorOf('age'))}
              />
            </div>
            {errorOf('age') ? (
              <p
                role="alert"
                className="mt-1.5 text-sm font-semibold text-danger"
              >
                {errorOf('age')}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-fg-muted">
                {t('form.estimatedHint')}
              </p>
            )}
          </div>
        )}
      </div>

      <TextField
        label={t('form.chip')}
        name="chipNumber"
        inputMode="numeric"
        autoComplete="off"
        placeholder={t('form.chipPlaceholder')}
        maxLength={21}
        value={values.chipNumber}
        onChange={(e) => update('chipNumber', e.target.value)}
        error={errorOf('chipNumber')}
        hint={
          mode === 'edit' && original?.chipNumberMasked
            ? t('form.chipLocked')
            : t('form.chipHint')
        }
      />

      <Checkbox
        label={t('form.neutered')}
        checked={values.isNeutered}
        onChange={(e) => update('isNeutered', e.target.checked)}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
