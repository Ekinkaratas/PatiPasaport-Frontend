import {
  LabResultFlag,
  RecordType,
  type LabResultItem,
  type RecordContent,
} from '@/api/types';
import type { ValidationCode } from '@/domain/validation';

export const RECORD_TYPES = [
  RecordType.EXAMINATION,
  RecordType.VACCINATION,
  RecordType.PRESCRIPTION,
  RecordType.LAB_RESULT,
  RecordType.SURGERY,
] as const;

export const RECORD_TYPE_CODES: Record<number, string> = {
  [RecordType.EXAMINATION]: 'EXAMINATION',
  [RecordType.VACCINATION]: 'VACCINATION',
  [RecordType.PRESCRIPTION]: 'PRESCRIPTION',
  [RecordType.LAB_RESULT]: 'LAB_RESULT',
  [RecordType.SURGERY]: 'SURGERY',
};

export const LAB_FLAGS = [
  LabResultFlag.UNSPECIFIED,
  LabResultFlag.NORMAL,
  LabResultFlag.LOW,
  LabResultFlag.HIGH,
] as const;

export const RECORD_LIMITS = {
  titleMin: 2,
  titleMax: 128,
  notesMax: 2000,
  nameMax: 128,
  shortMax: 64,
  labUnitMax: 32,
  instructionsMax: 1000,
  durationMin: 1,
  durationMax: 365,
  labItemsMin: 1,
  labItemsMax: 50,
} as const;

export interface LabItemValues {
  key: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: string;
}

export interface RecordFormValues {
  type: string;
  title: string;
  notes: string;
  recordedAt: string;
  vaccineName: string;
  batchNumber: string;
  administeredAt: string;
  nextDueAt: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  instructions: string;
  prescribedAt: string;
  sampledAt: string;
  labItems: LabItemValues[];
}

export type RecordFormErrors = Record<string, string>;

let keySeed = 0;

export function newLabItem(item?: Partial<LabResultItem>): LabItemValues {
  keySeed += 1;
  return {
    key: `lab-${keySeed}`,
    testName: item?.testName ?? '',
    value: item?.value ?? '',
    unit: item?.unit ?? '',
    referenceRange: item?.referenceRange ?? '',
    flag: String(item?.flag ?? LabResultFlag.UNSPECIFIED),
  };
}

export function emptyRecordForm(today: string): RecordFormValues {
  return {
    type: '',
    title: '',
    notes: '',
    recordedAt: today,
    vaccineName: '',
    batchNumber: '',
    administeredAt: today,
    nextDueAt: '',
    medicationName: '',
    dosage: '',
    frequency: '',
    durationDays: '',
    instructions: '',
    prescribedAt: today,
    sampledAt: today,
    labItems: [newLabItem()],
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function recordFormFrom(
  content: RecordContent | null | undefined,
  today: string,
  { fillDates = true }: { fillDates?: boolean } = {},
): RecordFormValues {
  const base = emptyRecordForm(fillDates ? today : '');
  if (!content) return base;
  const type = (RECORD_TYPES as readonly number[]).includes(content.type)
    ? String(content.type)
    : '';
  const vaccination = content.vaccination;
  const prescription = content.prescription;
  const labResult = content.labResult;
  const items = Array.isArray(labResult?.items) ? labResult.items : [];
  return {
    ...base,
    type,
    title: text(content.title),
    notes: text(content.notes),
    recordedAt: text(content.recordedAt) || base.recordedAt,
    vaccineName: text(vaccination?.vaccineName),
    batchNumber: text(vaccination?.batchNumber),
    administeredAt: text(vaccination?.administeredAt) || base.administeredAt,
    nextDueAt: text(vaccination?.nextDueAt),
    medicationName: text(prescription?.medicationName),
    dosage: text(prescription?.dosage),
    frequency: text(prescription?.frequency),
    durationDays:
      typeof prescription?.durationDays === 'number' &&
      prescription.durationDays > 0
        ? String(prescription.durationDays)
        : '',
    instructions: text(prescription?.instructions),
    prescribedAt: text(prescription?.prescribedAt) || base.prescribedAt,
    sampledAt: text(labResult?.sampledAt) || base.sampledAt,
    labItems:
      items.length > 0
        ? items.map((item) => newLabItem(item))
        : fillDates
          ? base.labItems
          : [],
  };
}

export function isApprovableAsIs(
  content: RecordContent | null | undefined,
  today: string,
): boolean {
  if (!content) return false;
  const values = recordFormFrom(content, today, { fillDates: false });
  return Object.keys(validateRecordForm(values, today)).length === 0;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function hasControlCharacter(value: string, multiline: boolean): boolean {
  return [...value].some((char) => {
    const code = char.charCodeAt(0);
    if (multiline && (code === 0x0a || code === 0x0d)) return false;
    return code < 0x20 || code === 0x7f;
  });
}

function validateText(
  prefix: string,
  raw: string,
  {
    required,
    max,
    min,
    multiline = false,
  }: { required: boolean; max: number; min?: number; multiline?: boolean },
): ValidationCode | null {
  const value = raw.trim();
  if (!value) return required ? `${prefix}_NOT_EMPTY` : null;
  if (min !== undefined && value.length < min) {
    return `${prefix}_MIN_LENGTH|${min}`;
  }
  if (value.length > max) return `${prefix}_MAX_LENGTH|${max}`;
  if (hasControlCharacter(value, multiline)) {
    return `${prefix}_WRONG DATA FORMAT`;
  }
  return null;
}

function validateDate(
  prefix: string,
  value: string,
  { required, today }: { required: boolean; today?: string },
): ValidationCode | null {
  if (!value) return required ? `${prefix}_NOT_EMPTY` : null;
  if (!DATE_ONLY.test(value) || Number.isNaN(Date.parse(value))) {
    return `${prefix}_MUST_BE_DATE`;
  }
  if (today && value > today) return `${prefix}_CANNOT_BE_FUTURE`;
  return null;
}

export function validateRecordForm(
  values: RecordFormValues,
  today: string,
): RecordFormErrors {
  const errors: RecordFormErrors = {};
  const set = (field: string, code: ValidationCode | null) => {
    if (code) errors[field] = code;
  };
  const L = RECORD_LIMITS;

  if (!values.type) set('type', 'RECORD_TYPE_NOT_EMPTY');
  set(
    'title',
    validateText('TITLE', values.title, {
      required: true,
      min: L.titleMin,
      max: L.titleMax,
    }),
  );
  set(
    'notes',
    validateText('NOTES', values.notes, {
      required: false,
      max: L.notesMax,
      multiline: true,
    }),
  );
  set(
    'recordedAt',
    validateDate('RECORDED_AT', values.recordedAt, { required: true, today }),
  );

  const type = Number(values.type);
  if (type === RecordType.VACCINATION) {
    set(
      'vaccineName',
      validateText('VACCINE_NAME', values.vaccineName, {
        required: true,
        max: L.nameMax,
      }),
    );
    set(
      'batchNumber',
      validateText('BATCH_NUMBER', values.batchNumber, {
        required: false,
        max: L.shortMax,
      }),
    );
    set(
      'administeredAt',
      validateDate('ADMINISTERED_AT', values.administeredAt, {
        required: true,
        today,
      }),
    );
    const nextDue = validateDate('NEXT_DUE_AT', values.nextDueAt, {
      required: false,
    });
    set(
      'nextDueAt',
      nextDue ??
        (values.nextDueAt &&
        values.administeredAt &&
        values.nextDueAt <= values.administeredAt
          ? 'NEXT_DUE_AT_NOT_VALID'
          : null),
    );
  }

  if (type === RecordType.PRESCRIPTION) {
    set(
      'medicationName',
      validateText('MEDICATION_NAME', values.medicationName, {
        required: true,
        max: L.nameMax,
      }),
    );
    set(
      'dosage',
      validateText('DOSAGE', values.dosage, {
        required: true,
        max: L.shortMax,
      }),
    );
    set(
      'frequency',
      validateText('FREQUENCY', values.frequency, {
        required: true,
        max: L.shortMax,
      }),
    );
    const duration = values.durationDays.trim();
    set(
      'durationDays',
      !duration
        ? 'DURATION_DAYS_NOT_EMPTY'
        : !/^\d+$/.test(duration)
          ? 'DURATION_DAYS_MUST_BE_NUMBER'
          : Number(duration) < L.durationMin
            ? `DURATION_DAYS_MIN|${L.durationMin}`
            : Number(duration) > L.durationMax
              ? `DURATION_DAYS_MAX|${L.durationMax}`
              : null,
    );
    set(
      'instructions',
      validateText('INSTRUCTIONS', values.instructions, {
        required: false,
        max: L.instructionsMax,
        multiline: true,
      }),
    );
    set(
      'prescribedAt',
      validateDate('PRESCRIBED_AT', values.prescribedAt, {
        required: true,
        today,
      }),
    );
  }

  if (type === RecordType.LAB_RESULT) {
    if (values.labItems.length < L.labItemsMin) {
      set('labItems', `LAB_RESULT_ITEMS_MIN|${L.labItemsMin}`);
    } else if (values.labItems.length > L.labItemsMax) {
      set('labItems', `LAB_RESULT_ITEMS_MAX|${L.labItemsMax}`);
    }
    values.labItems.forEach((item, index) => {
      const at = (field: string) => `labItems.${index}.${field}`;
      set(
        at('testName'),
        validateText('TEST_NAME', item.testName, {
          required: true,
          max: L.nameMax,
        }),
      );
      set(
        at('value'),
        validateText('LAB_VALUE', item.value, {
          required: true,
          max: L.shortMax,
        }),
      );
      set(
        at('unit'),
        validateText('LAB_UNIT', item.unit, {
          required: false,
          max: L.labUnitMax,
        }),
      );
      set(
        at('referenceRange'),
        validateText('REFERENCE_RANGE', item.referenceRange, {
          required: false,
          max: L.shortMax,
        }),
      );
      if (!(LAB_FLAGS as readonly number[]).includes(Number(item.flag))) {
        set(at('flag'), 'LAB_RESULT_FLAG_NOT_VALID');
      }
    });
    set(
      'sampledAt',
      validateDate('SAMPLED_AT', values.sampledAt, { required: true, today }),
    );
  }

  return errors;
}

export function toRecordContent(values: RecordFormValues): RecordContent {
  const type = Number(values.type) as RecordType;
  const content: RecordContent = {
    type,
    title: values.title.trim(),
    notes: values.notes.trim(),
    recordedAt: values.recordedAt,
  };
  if (type === RecordType.VACCINATION) {
    content.vaccination = {
      vaccineName: values.vaccineName.trim(),
      batchNumber: values.batchNumber.trim(),
      administeredAt: values.administeredAt,
      nextDueAt: values.nextDueAt,
    };
  }
  if (type === RecordType.PRESCRIPTION) {
    content.prescription = {
      medicationName: values.medicationName.trim(),
      dosage: values.dosage.trim(),
      frequency: values.frequency.trim(),
      durationDays: Number(values.durationDays.trim()),
      instructions: values.instructions.trim(),
      prescribedAt: values.prescribedAt,
    };
  }
  if (type === RecordType.LAB_RESULT) {
    content.labResult = {
      sampledAt: values.sampledAt,
      items: values.labItems.map((item) => ({
        testName: item.testName.trim(),
        value: item.value.trim(),
        unit: item.unit.trim(),
        referenceRange: item.referenceRange.trim(),
        flag: Number(item.flag) as LabResultFlag,
      })),
    };
  }
  return content;
}

export function prescriptionEndDate(prescribedAt: string, days: number) {
  const date = new Date(`${prescribedAt}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || days < 1) return '';
  date.setUTCDate(date.getUTCDate() + days - 1);
  return date.toISOString().slice(0, 10);
}

export const UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;
export const UPLOAD_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_NOTE_MAX = 500;
export const UPLOAD_NAME_MAX = 255;

export function validateUploadFile(file: File | null): ValidationCode | null {
  if (!file) return 'FILE_NOT_EMPTY';
  if (!(UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'MIME_TYPE_NOT_VALID';
  }
  if (file.size > UPLOAD_MAX_BYTES) return `SIZE_BYTES_MAX|${UPLOAD_MAX_BYTES}`;
  if (file.name.length > UPLOAD_NAME_MAX) {
    return `ORIGINAL_NAME_MAX_LENGTH|${UPLOAD_NAME_MAX}`;
  }
  return null;
}

export function validateUploadNote(raw: string): ValidationCode | null {
  return validateText('NOTE', raw, {
    required: false,
    max: UPLOAD_NOTE_MAX,
    multiline: true,
  });
}

export function formatBytes(bytes: number, language: string): string {
  const locale = language === 'tr' ? 'tr-TR' : 'en-GB';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB'];
  let value = bytes / 1024;
  let unit = units[0]!;
  if (value >= 1024) {
    value /= 1024;
    unit = units[1]!;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

export const RECORD_SERVER_FIELDS: Record<string, string> = {
  RECORD_TYPE: 'type',
  TITLE: 'title',
  NOTES: 'notes',
  RECORDED_AT: 'recordedAt',
  VACCINE_NAME: 'vaccineName',
  BATCH_NUMBER: 'batchNumber',
  ADMINISTERED_AT: 'administeredAt',
  NEXT_DUE_AT: 'nextDueAt',
  MEDICATION_NAME: 'medicationName',
  DOSAGE: 'dosage',
  FREQUENCY: 'frequency',
  DURATION_DAYS: 'durationDays',
  INSTRUCTIONS: 'instructions',
  PRESCRIBED_AT: 'prescribedAt',
  SAMPLED_AT: 'sampledAt',
  LAB_RESULT_ITEMS: 'labItems',
};
