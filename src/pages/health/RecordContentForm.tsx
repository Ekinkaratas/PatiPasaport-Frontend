import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RecordType } from '@/api/types';
import { RadioGroup } from '@/components/form/RadioGroup';
import { Select } from '@/components/form/Select';
import { TextArea } from '@/components/form/TextArea';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { translateError } from '@/i18n/translateError';
import {
  LAB_FLAGS,
  newLabItem,
  RECORD_LIMITS,
  RECORD_TYPE_CODES,
  RECORD_TYPES,
  type LabItemValues,
  type RecordFormErrors,
  type RecordFormValues,
} from './recordModel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

const FLAG_KEYS: Record<number, string> = {
  0: 'flags.unspecified',
  1: 'flags.normal',
  2: 'flags.low',
  3: 'flags.high',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5 rounded-2xl bg-cream-100 p-5">
      <legend className="sr-only">{title}</legend>
      <p className="text-sm font-extrabold tracking-wide text-cocoa-600 uppercase">
        {title}
      </p>
      {children}
    </fieldset>
  );
}

export function RecordContentForm({
  values,
  errors,
  today,
  onChange,
}: {
  values: RecordFormValues;
  errors: RecordFormErrors;
  today: string;
  onChange: (next: RecordFormValues) => void;
}) {
  const { t, i18n } = useTranslation('health');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const L = RECORD_LIMITS;
  const errorOf = (path: string) =>
    errors[path] ? translateError(errors[path], i18n) : null;
  const set = <K extends keyof RecordFormValues>(
    key: K,
    value: RecordFormValues[K],
  ) => onChange({ ...values, [key]: value });
  const setItem = (index: number, patch: Partial<LabItemValues>) =>
    set(
      'labItems',
      values.labItems.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );
  const type = Number(values.type);

  return (
    <div className="space-y-6">
      <RadioGroup
        label={t('form.type')}
        name="recordType"
        value={values.type}
        columns={3}
        onChange={(value) => set('type', value)}
        error={errorOf('type')}
        options={RECORD_TYPES.map((value) => ({
          value: String(value),
          label: translate(`enums:recordType.${RECORD_TYPE_CODES[value]}`),
        }))}
      />
      <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
        <TextField
          label={t('form.title')}
          name="title"
          autoComplete="off"
          maxLength={L.titleMax}
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          error={errorOf('title')}
          required
        />
        <TextField
          label={t('form.recordedAt')}
          name="recordedAt"
          type="date"
          max={today}
          value={values.recordedAt}
          onChange={(e) => set('recordedAt', e.target.value)}
          error={errorOf('recordedAt')}
          required
        />
      </div>
      <TextArea
        label={t('form.notes')}
        name="notes"
        maxLength={L.notesMax}
        value={values.notes}
        onChange={(e) => set('notes', e.target.value)}
        error={errorOf('notes')}
        hint={t('form.optional')}
      />

      {type === RecordType.VACCINATION && (
        <Section title={t('form.vaccinationSection')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={t('vaccination.name')}
              name="vaccineName"
              autoComplete="off"
              maxLength={L.nameMax}
              value={values.vaccineName}
              onChange={(e) => set('vaccineName', e.target.value)}
              error={errorOf('vaccineName')}
              required
            />
            <TextField
              label={t('vaccination.batch')}
              name="batchNumber"
              autoComplete="off"
              maxLength={L.shortMax}
              value={values.batchNumber}
              onChange={(e) => set('batchNumber', e.target.value)}
              error={errorOf('batchNumber')}
              hint={t('form.optional')}
            />
            <TextField
              label={t('vaccination.administeredAt')}
              name="administeredAt"
              type="date"
              max={today}
              value={values.administeredAt}
              onChange={(e) => set('administeredAt', e.target.value)}
              error={errorOf('administeredAt')}
              required
            />
            <TextField
              label={t('vaccination.nextDueAt')}
              name="nextDueAt"
              type="date"
              min={values.administeredAt || undefined}
              value={values.nextDueAt}
              onChange={(e) => set('nextDueAt', e.target.value)}
              error={errorOf('nextDueAt')}
              hint={t('form.optional')}
            />
          </div>
        </Section>
      )}

      {type === RecordType.PRESCRIPTION && (
        <Section title={t('form.prescriptionSection')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={t('prescription.medication')}
              name="medicationName"
              autoComplete="off"
              maxLength={L.nameMax}
              value={values.medicationName}
              onChange={(e) => set('medicationName', e.target.value)}
              error={errorOf('medicationName')}
              required
            />
            <TextField
              label={t('prescription.dosage')}
              name="dosage"
              autoComplete="off"
              maxLength={L.shortMax}
              placeholder={t('form.dosagePlaceholder')}
              value={values.dosage}
              onChange={(e) => set('dosage', e.target.value)}
              error={errorOf('dosage')}
              required
            />
            <TextField
              label={t('prescription.frequency')}
              name="frequency"
              autoComplete="off"
              maxLength={L.shortMax}
              placeholder={t('form.frequencyPlaceholder')}
              value={values.frequency}
              onChange={(e) => set('frequency', e.target.value)}
              error={errorOf('frequency')}
              required
            />
            <TextField
              label={t('form.durationDays')}
              name="durationDays"
              type="number"
              inputMode="numeric"
              min={L.durationMin}
              max={L.durationMax}
              step={1}
              value={values.durationDays}
              onChange={(e) => set('durationDays', e.target.value)}
              error={errorOf('durationDays')}
              required
            />
            <TextField
              label={t('form.prescribedAt')}
              name="prescribedAt"
              type="date"
              max={today}
              value={values.prescribedAt}
              onChange={(e) => set('prescribedAt', e.target.value)}
              error={errorOf('prescribedAt')}
              required
            />
          </div>
          <TextArea
            label={t('prescription.instructions')}
            name="instructions"
            rows={3}
            maxLength={L.instructionsMax}
            value={values.instructions}
            onChange={(e) => set('instructions', e.target.value)}
            error={errorOf('instructions')}
            hint={t('form.optional')}
          />
        </Section>
      )}

      {type === RecordType.LAB_RESULT && (
        <Section title={t('form.labSection')}>
          <TextField
            label={t('form.sampledAt')}
            name="sampledAt"
            type="date"
            max={today}
            value={values.sampledAt}
            onChange={(e) => set('sampledAt', e.target.value)}
            error={errorOf('sampledAt')}
            className="sm:max-w-xs"
            required
          />
          {errorOf('labItems') && (
            <p className="text-sm font-semibold text-coral-600">
              {errorOf('labItems')}
            </p>
          )}
          <ol className="space-y-4">
            {values.labItems.map((item, index) => {
              const at = (field: string) => `labItems.${index}.${field}`;
              return (
                <li
                  key={item.key}
                  className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-cream-300/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-cocoa-800">
                      {t('form.labRow', { number: index + 1 })}
                    </p>
                    {values.labItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-coral-700 hover:bg-coral-50"
                        aria-label={t('form.removeLabRow', {
                          number: index + 1,
                        })}
                        onClick={() =>
                          set(
                            'labItems',
                            values.labItems.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <TrashIcon className="size-4" />
                        {t('form.remove')}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label={t('lab.test')}
                      name={at('testName')}
                      autoComplete="off"
                      maxLength={L.nameMax}
                      value={item.testName}
                      onChange={(e) =>
                        setItem(index, { testName: e.target.value })
                      }
                      error={errorOf(at('testName'))}
                      required
                    />
                    <TextField
                      label={t('lab.value')}
                      name={at('value')}
                      autoComplete="off"
                      maxLength={L.shortMax}
                      value={item.value}
                      onChange={(e) =>
                        setItem(index, { value: e.target.value })
                      }
                      error={errorOf(at('value'))}
                      required
                    />
                    <TextField
                      label={t('lab.unit')}
                      name={at('unit')}
                      autoComplete="off"
                      maxLength={L.labUnitMax}
                      value={item.unit}
                      onChange={(e) => setItem(index, { unit: e.target.value })}
                      error={errorOf(at('unit'))}
                      hint={t('form.optional')}
                    />
                    <TextField
                      label={t('lab.reference')}
                      name={at('referenceRange')}
                      autoComplete="off"
                      maxLength={L.shortMax}
                      value={item.referenceRange}
                      onChange={(e) =>
                        setItem(index, { referenceRange: e.target.value })
                      }
                      error={errorOf(at('referenceRange'))}
                      hint={t('form.optional')}
                    />
                    <Select
                      label={t('lab.flag')}
                      name={at('flag')}
                      value={item.flag}
                      onChange={(e) => setItem(index, { flag: e.target.value })}
                      error={errorOf(at('flag'))}
                      options={LAB_FLAGS.map((flag) => ({
                        value: String(flag),
                        label: t(FLAG_KEYS[flag] as 'flags.normal'),
                      }))}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
          {values.labItems.length < L.labItemsMax && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                set('labItems', [...values.labItems, newLabItem()])
              }
            >
              <PlusIcon className="size-4" />
              {t('form.addLabRow')}
            </Button>
          )}
        </Section>
      )}
    </div>
  );
}
