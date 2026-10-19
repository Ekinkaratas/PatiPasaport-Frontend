import { describe, expect, it } from 'vitest';
import { LabResultFlag, RecordType, type RecordContent } from '@/api/types';
import {
  accessFromScopes,
  canWriteRecords,
  FULL_HEALTH_ACCESS,
} from './healthAccess';
import {
  emptyRecordForm,
  formatBytes,
  isApprovableAsIs,
  newLabItem,
  prescriptionEndDate,
  recordFormFrom,
  toRecordContent,
  validateRecordForm,
  validateUploadFile,
  validateUploadNote,
  type RecordFormValues,
} from './recordModel';

const TODAY = '2026-10-17';

function form(patch: Partial<RecordFormValues>): RecordFormValues {
  return { ...emptyRecordForm(TODAY), ...patch };
}

describe('kayıt formu doğrulaması', () => {
  it('tür, başlık ve tarih kurallarını uygular', () => {
    expect(validateRecordForm(form({}), TODAY)).toEqual({
      type: 'RECORD_TYPE_NOT_EMPTY',
      title: 'TITLE_NOT_EMPTY',
    });
    expect(
      validateRecordForm(
        form({
          type: String(RecordType.EXAMINATION),
          title: 'K',
          recordedAt: '2026-10-18',
          notes: 'satır 1\nsatır 2',
        }),
        TODAY,
      ),
    ).toEqual({
      title: 'TITLE_MIN_LENGTH|2',
      recordedAt: 'RECORDED_AT_CANNOT_BE_FUTURE',
    });
    expect(
      validateRecordForm(
        form({ type: '1', title: 'Kontrol\tmuayenesi' }),
        TODAY,
      ).title,
    ).toBe('TITLE_WRONG DATA FORMAT');
  });

  it('aşı ayrıntılarını ister; sonraki doz uygulamadan sonra olmalı', () => {
    const base = form({ type: String(RecordType.VACCINATION), title: 'Kuduz' });
    expect(validateRecordForm(base, TODAY)).toEqual({
      vaccineName: 'VACCINE_NAME_NOT_EMPTY',
    });
    expect(
      validateRecordForm(
        { ...base, vaccineName: 'Rabisin', nextDueAt: TODAY },
        TODAY,
      ),
    ).toEqual({ nextDueAt: 'NEXT_DUE_AT_NOT_VALID' });
    expect(
      validateRecordForm(
        { ...base, vaccineName: 'Rabisin', nextDueAt: '2027-10-17' },
        TODAY,
      ),
    ).toEqual({});
  });

  it('reçetede süre 1-365 gün arasında tam sayı olmalı', () => {
    const base = form({
      type: String(RecordType.PRESCRIPTION),
      title: 'Antibiyotik',
      medicationName: 'Amoksisilin',
      dosage: '250 mg',
      frequency: 'Günde 2 kez',
    });
    expect(validateRecordForm(base, TODAY).durationDays).toBe(
      'DURATION_DAYS_NOT_EMPTY',
    );
    expect(
      validateRecordForm({ ...base, durationDays: '0' }, TODAY).durationDays,
    ).toBe('DURATION_DAYS_MIN|1');
    expect(
      validateRecordForm({ ...base, durationDays: '366' }, TODAY).durationDays,
    ).toBe('DURATION_DAYS_MAX|365');
    expect(validateRecordForm({ ...base, durationDays: '7' }, TODAY)).toEqual(
      {},
    );
  });

  it('tahlil satırlarını tek tek denetler', () => {
    const values = form({
      type: String(RecordType.LAB_RESULT),
      title: 'Kan tahlili',
      labItems: [
        newLabItem({ testName: 'ALT', value: '45' }),
        newLabItem({ testName: '', value: '' }),
      ],
    });
    expect(validateRecordForm(values, TODAY)).toEqual({
      'labItems.1.testName': 'TEST_NAME_NOT_EMPTY',
      'labItems.1.value': 'LAB_VALUE_NOT_EMPTY',
    });
    expect(
      validateRecordForm({ ...values, labItems: [] }, TODAY).labItems,
    ).toBe('LAB_RESULT_ITEMS_MIN|1');
  });
});

describe('kayıt içeriğine dönüşüm', () => {
  it('yalnızca seçilen türün ayrıntısını gönderir ve metinleri kırpar', () => {
    const content = toRecordContent(
      form({
        type: String(RecordType.PRESCRIPTION),
        title: '  Antibiyotik ',
        medicationName: ' Amoksisilin ',
        dosage: '250 mg',
        frequency: 'Günde 2 kez',
        durationDays: ' 7 ',
        vaccineName: 'gönderilmemeli',
      }),
    );
    expect(content).toEqual({
      type: RecordType.PRESCRIPTION,
      title: 'Antibiyotik',
      notes: '',
      recordedAt: TODAY,
      prescription: {
        medicationName: 'Amoksisilin',
        dosage: '250 mg',
        frequency: 'Günde 2 kez',
        durationDays: 7,
        instructions: '',
        prescribedAt: TODAY,
      },
    });
  });

  it('tahlil bayrağını sayıya çevirir', () => {
    const content = toRecordContent(
      form({
        type: String(RecordType.LAB_RESULT),
        title: 'Kan',
        labItems: [newLabItem({ testName: 'ALT', value: '90', flag: 3 })],
      }),
    );
    expect(content.labResult?.items[0]?.flag).toBe(LabResultFlag.HIGH);
  });
});

describe('AI taslağı', () => {
  const proposal: RecordContent = {
    type: RecordType.VACCINATION,
    title: 'Kuduz aşısı',
    notes: '',
    recordedAt: '2026-10-10',
    vaccination: {
      vaccineName: 'Rabisin',
      batchNumber: 'A1',
      administeredAt: '2026-10-10',
      nextDueAt: '2027-10-10',
    },
  };

  it('öneriden formu doldurur', () => {
    expect(recordFormFrom(proposal, TODAY)).toMatchObject({
      type: '2',
      title: 'Kuduz aşısı',
      vaccineName: 'Rabisin',
      nextDueAt: '2027-10-10',
    });
  });

  it('eksik tarih uydurulmadan olduğu gibi onaylanabilirlik denetlenir', () => {
    expect(isApprovableAsIs(proposal, TODAY)).toBe(true);
    expect(isApprovableAsIs({ ...proposal, recordedAt: '' }, TODAY)).toBe(
      false,
    );
    expect(isApprovableAsIs({ ...proposal, vaccination: null }, TODAY)).toBe(
      false,
    );
    expect(isApprovableAsIs(null, TODAY)).toBe(false);
  });
});

describe('yardımcılar', () => {
  it('reçete bitiş tarihini hesaplar', () => {
    expect(prescriptionEndDate('2026-10-17', 7)).toBe('2026-10-23');
    expect(prescriptionEndDate('2026-12-30', 3)).toBe('2027-01-01');
    expect(prescriptionEndDate('', 3)).toBe('');
  });

  it('yükleme dosyasını ve notunu denetler', () => {
    const file = (type: string, size: number, name = 'sonuc.pdf') =>
      new File([new Uint8Array(size)], name, { type });
    expect(validateUploadFile(null)).toBe('FILE_NOT_EMPTY');
    expect(validateUploadFile(file('text/plain', 10, 'a.txt'))).toBe(
      'MIME_TYPE_NOT_VALID',
    );
    expect(validateUploadFile(file('application/pdf', 10))).toBeNull();
    expect(validateUploadFile(file('image/png', 10 * 1024 * 1024 + 1))).toBe(
      'SIZE_BYTES_MAX|10485760',
    );
    expect(validateUploadNote('a'.repeat(501))).toBe('NOTE_MAX_LENGTH|500');
    expect(validateUploadNote('iki\nsatır')).toBeNull();
  });

  it('boyutu okunur biçimde gösterir', () => {
    expect(formatBytes(512, 'tr')).toBe('512 B');
    expect(formatBytes(1536, 'tr')).toBe('1,5 KB');
    expect(formatBytes(3 * 1024 * 1024, 'en')).toBe('3 MB');
  });

  it('izin kapsamlarını sekmelere çevirir', () => {
    expect(accessFromScopes(['vaccination_read'])).toEqual({
      records: false,
      vaccinations: true,
      prescriptions: false,
      labResults: false,
      documents: false,
    });
    expect(
      accessFromScopes([
        'medical_read',
        'vaccination_read',
        'prescription_read',
        'medical_write',
      ]),
    ).toEqual(FULL_HEALTH_ACCESS);
    expect(canWriteRecords(['medical_read'])).toBe(false);
    expect(canWriteRecords(['medical_write'])).toBe(true);
  });
});
