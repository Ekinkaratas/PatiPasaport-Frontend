import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { LabResultFlag, RecordType, type MedicalRecord } from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { apiOk, installApi } from '@/test/apiMock';
import { renderRoute } from '@/test/renderWithProviders';
import { FULL_HEALTH_ACCESS, NO_HEALTH_ACCESS } from './healthAccess';
import { HealthSection } from './HealthSection';

const PET = '0f8c7a51-7f0e-4c43-9a55-5d3f8f1a2b01';
const CLINIC = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';

function page<T>(key: string, items: T[]) {
  return apiOk({ [key]: items, total: items.length, page: 1, pageSize: 8 });
}

const RECORD: MedicalRecord = {
  id: 'r1',
  petId: PET,
  clinicId: CLINIC,
  type: RecordType.VACCINATION,
  title: 'Kuduz aşısı',
  notes: 'Reaksiyon gözlenmedi.',
  recordedAt: '2026-10-10',
  attachments: [
    {
      documentId: 'd1',
      storagePath: '',
      originalName: 'karne.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      uploadedAt: '',
    },
  ],
  sourceDraftReviewId: 'dr1',
  createdAt: '2026-10-10T10:00:00.000Z',
  vaccination: {
    vaccineName: 'Rabisin',
    batchNumber: 'B-12',
    administeredAt: '2026-10-10',
    nextDueAt: '2027-10-10',
  },
};

function useBackend() {
  return installApi(({ path }) => {
    if (path === `/api/clinics/${CLINIC}`) {
      return apiOk({ clinic: { id: CLINIC, name: 'Pati Test Kliniği' } });
    }
    if (path === `/api/pets/${PET}/records`) return page('records', [RECORD]);
    if (path === `/api/pets/${PET}/vaccinations`) {
      return page('vaccinations', [
        {
          id: 'v1',
          recordId: 'r1',
          petId: PET,
          vaccineName: 'Rabisin',
          batchNumber: 'B-12',
          administeredAt: '2026-10-10',
          nextDueAt: '2027-10-10',
          clinicId: CLINIC,
        },
      ]);
    }
    if (path === `/api/pets/${PET}/lab-results`) {
      return page('labResults', [
        {
          id: 'l1',
          recordId: 'r2',
          petId: PET,
          clinicId: CLINIC,
          testName: 'ALT',
          value: '92',
          unit: 'U/L',
          referenceRange: '10-80',
          flag: LabResultFlag.HIGH,
          sampledAt: '2026-10-01',
        },
      ]);
    }
    return undefined;
  });
}

beforeEach(async () => {
  __resetSessionForTests();
  startSession({
    accessToken: 'AT',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresIn: 43200,
    userId: 'owner',
    clinicId: '',
  });
  await i18n.changeLanguage('tr');
});

afterEach(() => vi.unstubAllGlobals());

describe('HealthSection', () => {
  it('kayıtları ayrıntı, klinik adı ve eklerle gösterir', async () => {
    useBackend();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);

    const card = (await screen.findByText('Kuduz aşısı')).closest('article')!;
    expect(within(card).getAllByText('Aşı')).toHaveLength(2);
    expect(within(card).getByText('Sonraki doz')).toBeVisible();
    expect(within(card).getByText('AI taslağından')).toBeVisible();
    expect(within(card).getByText('Reaksiyon gözlenmedi.')).toBeVisible();
    expect(within(card).getByText('Rabisin')).toBeVisible();
    expect(within(card).getByText('karne.pdf')).toBeVisible();
    expect(await within(card).findByText('Pati Test Kliniği')).toBeVisible();
  });

  it('sekmeler arasında gezinir ve filtreleri isteğe ekler', async () => {
    const api = useBackend();
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);
    await screen.findByText('Kuduz aşısı');

    await user.click(screen.getByRole('tab', { name: 'Aşılar' }));
    expect(screen.getByRole('tab', { name: 'Aşılar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await screen.findByText('B-12', { exact: false });
    await user.click(
      screen.getByRole('checkbox', { name: 'Yalnızca yaklaşan dozlar' }),
    );
    await waitFor(() =>
      expect(
        api
          .find('GET', `/api/pets/${PET}/vaccinations`)
          .some((request) => request.query.get('onlyUpcoming') === 'true'),
      ).toBe(true),
    );

    await user.click(screen.getByRole('tab', { name: 'Tahliller' }));
    const table = await screen.findByRole('table', { name: 'Tahliller' });
    expect(within(table).getByText('Yüksek')).toBeVisible();
    await user.type(screen.getByLabelText('Test adına göre ara'), 'alt');
    await user.click(screen.getByRole('button', { name: 'Ara' }));
    await waitFor(() =>
      expect(
        api
          .find('GET', `/api/pets/${PET}/lab-results`)
          .some((request) => request.query.get('testName') === 'alt'),
      ).toBe(true),
    );
  });

  it('izin olmayan sekmede istek atmadan nedenini söyler', async () => {
    const api = useBackend();
    renderRoute(<HealthSection petId={PET} access={NO_HEALTH_ACCESS} />);

    expect(
      screen.getByText(/"Tıbbi kayıtları görme" kapsamı olmalı/),
    ).toBeVisible();
    expect(api.requests).toHaveLength(0);
  });
});
