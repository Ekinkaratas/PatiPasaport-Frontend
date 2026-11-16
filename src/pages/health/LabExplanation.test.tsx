import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { translateError } from '@/i18n/translateError';
import { ApiError } from '@/api/errors';
import {
  LabExplanationStatus,
  RecordType,
  type LabExplanationResponse,
  type MedicalRecord,
} from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { apiFail, apiOk, installApi } from '@/test/apiMock';
import { renderRoute } from '@/test/renderWithProviders';
import { FULL_HEALTH_ACCESS } from './healthAccess';
import { HealthSection } from './HealthSection';

const PET = '0f8c7a51-7f0e-4c43-9a55-5d3f8f1a2b01';
const CLINIC = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const RECORD_A = '6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const RECORD_B = '7b2e3d4c-5f6a-4b7c-9d8e-0f1a2b3c4d5e';

const PENDING: LabExplanationResponse = {
  status: LabExplanationStatus.PENDING,
  summary: '',
  items: [],
  confidence: 0,
  generatedAt: '',
};

const READY: LabExplanationResponse = {
  status: LabExplanationStatus.READY,
  summary: 'Değerlerin çoğu referans aralığında.',
  items: [{ testName: 'ALT', explanation: 'ALT karaciğer enzimidir.' }],
  confidence: 0.82,
  generatedAt: '2026-10-26T14:30:00.000Z',
};

function labRecord(overrides: Partial<MedicalRecord>): MedicalRecord {
  return {
    id: RECORD_A,
    petId: PET,
    clinicId: CLINIC,
    type: RecordType.LAB_RESULT,
    title: 'Biyokimya',
    notes: '',
    recordedAt: '2026-10-01',
    attachments: [
      {
        documentId: 'd1',
        storagePath: '',
        originalName: 'tahlil.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        uploadedAt: '2026-10-01T09:00:00.000Z',
      },
    ],
    sourceDraftReviewId: '',
    createdAt: '2026-10-01T09:05:00.000Z',
    labResult: { sampledAt: '2026-10-01', items: [] },
    ...overrides,
  };
}

function useBackend({
  labRecords = [labRecord({})],
  explanation = () => apiOk(READY),
}: {
  labRecords?: MedicalRecord[];
  explanation?: (recordId: string) => Response;
} = {}) {
  return installApi(({ path, query }) => {
    if (path === `/api/clinics/${CLINIC}`) {
      return apiOk({ clinic: { id: CLINIC, name: 'Pati Test Kliniği' } });
    }
    if (path === `/api/pets/${PET}/records`) {
      const lab = query.get('type') === String(RecordType.LAB_RESULT);
      const records = lab ? labRecords : [];
      return apiOk({
        records,
        total: records.length,
        page: 1,
        pageSize: Number(query.get('pageSize')),
      });
    }
    const match = /^\/api\/records\/([^/]+)\/explanation$/.exec(path);
    if (match) return explanation(match[1]!);
    return undefined;
  });
}

function explanationRequests(api: ReturnType<typeof installApi>) {
  return api.requests.filter((request) =>
    request.path.endsWith('/explanation'),
  );
}

async function openLabTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('tab', { name: 'Tahliller' }));
  await screen.findByLabelText('Sayfa başına');
  await waitFor(() =>
    expect(
      within(screen.getByRole('tabpanel')).getAllByRole('listitem').length,
    ).toBeGreaterThan(0),
  );
}

async function consent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: 'Yapay zekâ yorumlasın' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Okudum, yorumu göster' }),
  );
}

function renderOwner() {
  return renderRoute(
    <HealthSection
      petId={PET}
      access={FULL_HEALTH_ACCESS}
      showLabExplanations
    />,
  );
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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Tahlil açıklaması', () => {
  it('onay penceresinde yasal uyarıyı gösterir, vazgeçince yorumu açmaz', async () => {
    useBackend();
    const user = userEvent.setup();
    renderOwner();
    await openLabTab(user);

    expect(
      await screen.findByText(
        'Bu tahlil sonuçlarını yapay zekânın sade bir dille yorumlamasını ister misiniz?',
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Sonuçların açıklaması' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Yapay zekâ yorumlasın' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Yapay zekâ yorumu hakkında',
    });
    expect(
      within(dialog).getByText(/yapay zekâ tarafından üretilmiştir/),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));

    expect(
      screen.queryByRole('heading', { name: 'Sonuçların açıklaması' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Yapay zekâ yorumlasın' }),
    ).toBeVisible();
  });

  it('onaydan sonra hazırlanırken yeniden sorar, hazır olunca yorumu açık gösterir', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let calls = 0;
    const api = useBackend({
      explanation: () => {
        calls += 1;
        return apiOk(calls === 1 ? PENDING : READY);
      },
    });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderOwner();
    await openLabTab(user);
    await consent(user);

    const pending = await screen.findByText(
      'Açıklama hazırlanıyor. Birkaç saniye içinde burada görünecek.',
    );
    expect(pending.closest('[aria-live="polite"]')).not.toBeNull();
    expect(explanationRequests(api)).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(5_000);

    expect(
      await screen.findByRole('heading', { name: 'Sonuçların açıklaması' }),
    ).toBeVisible();
    expect(screen.getByText(/^Güven: .*82/)).toBeVisible();
    expect(
      screen.getByText('Değerlerin çoğu referans aralığında.'),
    ).toBeVisible();
    const list = screen.getByText('ALT karaciğer enzimidir.').closest('dl')!;
    expect(within(list).getByText('ALT').tagName).toBe('DT');
    expect(screen.getByText(/^Oluşturulma: /)).toBeVisible();
    expect(
      screen.getByText(/yapay zekâ tarafından üretilmiştir/),
    ).toBeVisible();

    const toggle = screen.getByRole('button', { name: 'Açıklamayı gizle' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName('Açıklamayı göster');
    expect(
      screen.getByText('Değerlerin çoğu referans aralığında.'),
    ).not.toBeVisible();
    expect(explanationRequests(api)[0]!.path).toBe(
      `/api/records/${RECORD_A}/explanation`,
    );

    const settled = explanationRequests(api).length;
    await vi.advanceTimersByTimeAsync(15_000);
    expect(explanationRequests(api)).toHaveLength(settled);
  });

  it('başarısız açıklamada sakin bir bilgi metni gösterir', async () => {
    useBackend({
      explanation: () =>
        apiOk({ ...PENDING, status: LabExplanationStatus.FAILED }),
    });
    const user = userEvent.setup();
    renderOwner();
    await openLabTab(user);
    await consent(user);

    const failed = await screen.findByText(
      'Bu sonuçlar için açıklama oluşturulamadı. Sorularınızı veteriner hekiminize iletebilirsiniz.',
    );
    expect(failed).toHaveClass('text-fg-muted');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('404 yanıtında hiçbir şey çizmez ve yeniden denemez', async () => {
    const api = useBackend({ explanation: () => apiFail(404, 'NOT_FOUND') });
    const user = userEvent.setup();
    renderOwner();
    await openLabTab(user);

    await waitFor(() => expect(explanationRequests(api)).toHaveLength(1));
    await waitFor(() =>
      expect(
        screen.queryByText(
          'Açıklama hazırlanıyor. Birkaç saniye içinde burada görünecek.',
        ),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('heading', { name: 'Sonuçların açıklaması' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Yapay zekâ yorumlasın' }),
    ).not.toBeInTheDocument();
    expect(explanationRequests(api)).toHaveLength(1);
  });

  it('bozuk kayıt kimliği hatasını anlaşılır bir cümleyle gösterir', async () => {
    useBackend({
      explanation: () => apiFail(400, 'RECORD_ID_WRONG DATA FORMAT'),
    });
    const user = userEvent.setup();
    renderOwner();
    await openLabTab(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Kayıt biçimi hatalı.',
    );
  });

  it('klinik görünümünde açıklama isteği hiç atılmaz', async () => {
    const api = useBackend();
    const user = userEvent.setup();
    renderRoute(
      <HealthSection
        petId={PET}
        access={FULL_HEALTH_ACCESS}
        ownClinicId={CLINIC}
      />,
    );
    await openLabTab(user);
    expect(await screen.findByText('tahlil.pdf')).toBeVisible();

    expect(explanationRequests(api)).toHaveLength(0);
    expect(
      screen.queryByText(
        'Açıklama hazırlanıyor. Birkaç saniye içinde burada görünecek.',
      ),
    ).not.toBeInTheDocument();
  });

  it('her tahlil kaydı dosyasıyla ya da başlığıyla listelenir ve her biri için açıklama istenir', async () => {
    const api = useBackend({
      labRecords: [
        labRecord({}),
        labRecord({
          id: RECORD_B,
          title: 'Hemogram',
          recordedAt: '2026-09-15',
          attachments: [],
          labResult: { sampledAt: '2026-09-15', items: [] },
        }),
      ],
    });
    const user = userEvent.setup();
    renderOwner();
    await openLabTab(user);

    const items = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('tahlil.pdf')).toBeVisible();
    expect(within(items[0]!).getByRole('button', { name: /Aç/ })).toBeVisible();
    expect(within(items[1]!).getByText('Hemogram')).toBeVisible();
    expect(
      within(items[1]!).getByText('Belge yok; kayıt elle girildi.'),
    ).toBeVisible();
    expect(
      within(items[1]!).getByText(/Numune tarihi: 15 Eyl 2026/),
    ).toBeVisible();
    expect(
      screen.queryByRole('table', { name: 'Tahliller' }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findAllByRole('button', { name: 'Yapay zekâ yorumlasın' }),
    ).toHaveLength(2);
    expect(
      explanationRequests(api)
        .map((request) => request.path)
        .sort(),
    ).toEqual(
      [
        `/api/records/${RECORD_A}/explanation`,
        `/api/records/${RECORD_B}/explanation`,
      ].sort(),
    );
  });

  it('sayfa boyutu 8 ile başlar; seçilen boyut isteğe yazılır', async () => {
    const api = useBackend();
    const user = userEvent.setup();
    renderOwner();
    await openLabTab(user);

    const select = screen.getByLabelText('Sayfa başına');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['8', '16', '32', '64', '128']);
    const labRequests = () =>
      api
        .find('GET', `/api/pets/${PET}/records`)
        .filter(
          (request) =>
            request.query.get('type') === String(RecordType.LAB_RESULT),
        );
    expect(labRequests()[0]?.query.get('pageSize')).toBe('8');

    await user.selectOptions(select, '16');

    await waitFor(() =>
      expect(
        labRequests().some(
          (request) =>
            request.query.get('pageSize') === '16' &&
            request.query.get('page') === '1',
        ),
      ).toBe(true),
    );
  });
});

describe('RECORD_ID hata metni', () => {
  it('RECORD_ID_WRONG DATA FORMAT iki dilde anlaşılır cümleye döner', async () => {
    const error = new ApiError({
      status: 400,
      code: 'RECORD_ID_WRONG DATA FORMAT',
    });
    await i18n.changeLanguage('tr');
    expect(translateError(error, i18n)).toBe('Kayıt biçimi hatalı.');
    await i18n.changeLanguage('en');
    expect(translateError(error, i18n)).toBe('Record has an invalid format.');
    await i18n.changeLanguage('tr');
  });
});
