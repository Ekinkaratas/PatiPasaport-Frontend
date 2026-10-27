import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { translateError } from '@/i18n/translateError';
import { ApiError } from '@/api/errors';
import {
  LabExplanationStatus,
  LabResultFlag,
  type LabExplanationResponse,
  type LabResult,
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

function lab(overrides: Partial<LabResult>): LabResult {
  return {
    id: 'l1',
    recordId: RECORD_A,
    petId: PET,
    clinicId: CLINIC,
    testName: 'ALT',
    value: '92',
    unit: 'U/L',
    referenceRange: '10-80',
    flag: LabResultFlag.HIGH,
    sampledAt: '2026-10-01',
    ...overrides,
  };
}

function useBackend({
  labResults = [lab({})],
  explanation = () => apiOk(READY),
}: {
  labResults?: LabResult[];
  explanation?: (recordId: string) => Response;
} = {}) {
  return installApi(({ path }) => {
    if (path === `/api/clinics/${CLINIC}`) {
      return apiOk({ clinic: { id: CLINIC, name: 'Pati Test Kliniği' } });
    }
    if (path === `/api/pets/${PET}/records`) {
      return apiOk({ records: [], total: 0, page: 1, pageSize: 8 });
    }
    if (path === `/api/pets/${PET}/lab-results`) {
      return apiOk({
        labResults,
        total: labResults.length,
        page: 1,
        pageSize: 8,
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
  await screen.findAllByRole('table', { name: 'Tahliller' });
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
    expect(await screen.findByText('Kliniğiniz')).toBeVisible();

    expect(explanationRequests(api)).toHaveLength(0);
    expect(
      screen.queryByText(
        'Açıklama hazırlanıyor. Birkaç saniye içinde burada görünecek.',
      ),
    ).not.toBeInTheDocument();
  });

  it('sayfadaki satırları kayda göre gruplar ve her grup için açıklama ister', async () => {
    const api = useBackend({
      labResults: [
        lab({ id: 'l1', recordId: RECORD_A, testName: 'ALT' }),
        lab({
          id: 'l2',
          recordId: RECORD_B,
          testName: 'Glukoz',
          sampledAt: '2026-09-15',
        }),
        lab({ id: 'l3', recordId: RECORD_A, testName: 'AST' }),
      ],
    });
    const user = userEvent.setup();
    renderOwner();
    await openLabTab(user);

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      '1 Eki 2026 tarihli tahlil',
      '15 Eyl 2026 tarihli tahlil',
    ]);
    const tables = screen.getAllByRole('table', { name: 'Tahliller' });
    expect(tables).toHaveLength(2);
    expect(
      within(tables[0]!)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['ALT', 'AST']);
    expect(
      within(tables[1]!)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Glukoz']);
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
    expect(await screen.findAllByText('Pati Test Kliniği')).toHaveLength(2);
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
