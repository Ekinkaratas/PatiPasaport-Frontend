import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import {
  ConditionLikelihood,
  HealthAssessmentStatus,
  HealthRiskLevel,
  LabTrend,
  RecommendationCategory,
  VaccinationDueStatus,
  type HealthAssessmentResponse,
} from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { apiFail, apiOk, installApi } from '@/test/apiMock';
import { renderRoute } from '@/test/renderWithProviders';
import { HealthAssessmentCard } from './HealthAssessmentPanel';

const PET = '0f8c7a51-7f0e-4c43-9a55-5d3f8f1a2b01';
const LATEST = `/api/pets/${PET}/health-assessments/latest`;
const REQUEST = `/api/pets/${PET}/health-assessments`;
const BACKEND_PAGE_SIZES = ['8', '16', '32', '64', '128'];
const NOW = new Date('2026-11-11T20:30:00.000Z');
const minutesAgo = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000).toISOString();

const PENDING: HealthAssessmentResponse = {
  status: HealthAssessmentStatus.PENDING,
  assessment: null,
  confidence: 0,
  requestedAt: minutesAgo(0),
  generatedAt: '',
  isStale: false,
};

const READY: HealthAssessmentResponse = {
  status: HealthAssessmentStatus.READY,
  assessment: {
    summary: 'Kan değerlerinde düşüş görülüyor.',
    riskLevel: HealthRiskLevel.MODERATE,
    findings: [
      {
        testName: 'HCT',
        trend: LabTrend.FALLING,
        interpretation: 'Referans aralığının altına indi.',
      },
    ],
    possibleConditions: [
      {
        name: 'Anemi ile ilişkili olabilir',
        likelihood: ConditionLikelihood.HIGH,
        evidence: ['HCT', 'HGB'],
        explanation: 'Değerlerin birlikte düşmesi anemiyle ilişkili olabilir.',
      },
    ],
    recommendations: [
      {
        category: RecommendationCategory.FOLLOW_UP_TEST,
        text: 'Kontrol hemogramını hekiminize sorun.',
      },
    ],
    vaccinationReminders: [
      {
        vaccineName: 'Kuduz',
        nextDueAt: '2026-10-12',
        status: VaccinationDueStatus.OVERDUE,
      },
    ],
    questionsForVet: ['Düşüşün nedeni ne olabilir?'],
  },
  confidence: 0.9,
  requestedAt: minutesAgo(20),
  generatedAt: minutesAgo(19),
  isStale: false,
};

function useBackend({
  latest = () => apiFail(404, 'NOT_FOUND'),
  request = () => apiOk(PENDING),
  records = 3,
}: {
  latest?: () => Response;
  request?: () => Response;
  records?: number;
} = {}) {
  return installApi(({ method, path, query }) => {
    if (path === `/api/pets/${PET}/records`) {
      if (!BACKEND_PAGE_SIZES.includes(query.get('pageSize') ?? '')) {
        return apiFail(400, 'PAGE_SIZE_IS_IN');
      }
      return apiOk({ records: [], total: records, page: 1, pageSize: 1 });
    }
    if (method === 'GET' && path === LATEST) return latest();
    if (method === 'POST' && path === REQUEST) return request();
    return undefined;
  });
}

async function openCard() {
  await screen.findByRole('heading', { name: 'Sağlık değerlendirmesi' });
}

function renderOwner() {
  return renderRoute(<HealthAssessmentCard petId={PET} />);
}

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
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

describe('Sağlık değerlendirmesi', () => {
  it('değerlendirme yoksa açıklama ve oluştur düğmesi; vazgeçince istek atmaz', async () => {
    const api = useBackend();
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderOwner();
    await openCard();

    expect(
      await screen.findByText(/onaylanmış tüm sağlık kayıtlarını/),
    ).toBeVisible();
    expect(
      screen.getAllByText(/teşhis yerine geçmez ve veteriner muayenesinin/)[0],
    ).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Değerlendirme oluştur' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Sağlık değerlendirmesi hakkında',
    });
    expect(within(dialog).getByText(/çip numarası/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));

    expect(api.find('POST', REQUEST)).toHaveLength(0);
  });

  it('onaydan sonra ister, hazırlanırken yeniden sorar, hazır olunca sonucu gösterir', async () => {
    let ready = false;
    const api = useBackend({
      latest: () =>
        ready
          ? apiOk({ ...READY, requestedAt: minutesAgo(0) })
          : apiFail(404, 'NOT_FOUND'),
    });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderOwner();
    await openCard();

    await user.click(
      await screen.findByRole('button', { name: 'Değerlendirme oluştur' }),
    );
    await user.click(screen.getByRole('button', { name: 'Okudum, oluştur' }));

    const pending = await screen.findByText(/Değerlendirme hazırlanıyor/);
    expect(pending.closest('[aria-live="polite"]')).not.toBeNull();
    expect(api.find('POST', REQUEST)).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: /Değerlendirme/ }),
    ).not.toBeInTheDocument();

    ready = true;
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await screen.findByText('Risk: Orta')).toBeVisible();
  });

  it('hazır sonucun bütün bölümlerini gösterir; güncel sonuçta düğme yok', async () => {
    useBackend({ latest: () => apiOk(READY) });
    renderOwner();
    await openCard();

    expect(await screen.findByText('Risk: Orta')).toBeVisible();
    expect(screen.getByText(/^Güven: .*90/)).toBeVisible();
    expect(screen.getByText('Kan değerlerinde düşüş görülüyor.')).toBeVisible();
    expect(screen.getByText('Azalıyor')).toBeVisible();
    expect(screen.getByText('Referans aralığının altına indi.')).toBeVisible();
    expect(screen.getByText('Olasılık: yüksek')).toBeVisible();
    expect(screen.getByText('Dayandığı testler: HCT, HGB')).toBeVisible();
    expect(screen.getByText(/^Kontrol testi:/)).toBeVisible();
    expect(screen.getByText('Kuduz')).toBeVisible();
    expect(screen.getByText('Gecikti')).toBeVisible();
    expect(screen.getByText('Düşüşün nedeni ne olabilir?')).toBeVisible();
    expect(screen.getByText(/^Oluşturulma: /)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Değerlendirme/ }),
    ).not.toBeInTheDocument();
  });

  it('eskimiş sonuçta yenile uyarısı; 10 dk dolana kadar düğme kilitli, sonra açılır', async () => {
    useBackend({
      latest: () =>
        apiOk({ ...READY, requestedAt: minutesAgo(4), isStale: true }),
    });
    renderOwner();
    await openCard();

    expect(await screen.findByText(/yeni kayıtlar eklendi/)).toBeVisible();
    const button = screen.getByRole('button', {
      name: 'Değerlendirmeyi yenile',
    });
    expect(button).toBeDisabled();
    expect(
      screen.getByText('23:36 sonrasında yeniden isteyebilirsiniz.'),
    ).toBeVisible();
    expect(screen.getByText('Risk: Orta')).toBeVisible();

    await vi.advanceTimersByTimeAsync(6 * 60_000 + 1_000);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Değerlendirmeyi yenile' }),
      ).toBeEnabled(),
    );
    expect(screen.queryByText(/sonrasında yeniden/)).not.toBeInTheDocument();
  });

  it('başarısız sonuçta yeniden denenir; backend hatası çevrilmiş mesajla görünür', async () => {
    useBackend({
      latest: () =>
        apiOk({
          ...PENDING,
          status: HealthAssessmentStatus.FAILED,
          requestedAt: minutesAgo(15),
        }),
      request: () => apiFail(429, 'HEALTH_ASSESSMENT_TOO_SOON'),
    });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderOwner();
    await openCard();

    expect(await screen.findByText(/şu an üretilemedi/)).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Değerlendirmeyi yenile' }),
    );
    await user.click(screen.getByRole('button', { name: 'Okudum, oluştur' }));

    expect(
      await screen.findByText(/Son istekten bu yana 10 dakika geçmedi/),
    ).toBeVisible();
  });

  it('30 dk aşan bekleyen istekte yeniden isteme düğmesi çıkar', async () => {
    useBackend({
      latest: () => apiOk({ ...PENDING, requestedAt: minutesAgo(31) }),
    });
    renderOwner();
    await openCard();

    expect(await screen.findByText(/beklenenden uzun sürdü/)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Değerlendirmeyi yenile' }),
    ).toBeEnabled();
  });

  it('hiç kayıt ve değerlendirme yoksa kart görünmez', async () => {
    const api = useBackend({ records: 0 });
    renderOwner();

    await waitFor(() => expect(api.find('GET', LATEST)).toHaveLength(1));
    await waitFor(() =>
      expect(api.find('GET', `/api/pets/${PET}/records`)).toHaveLength(1),
    );
    expect(
      screen.queryByRole('heading', { name: 'Sağlık değerlendirmesi' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Değerlendirme/ }),
    ).not.toBeInTheDocument();
  });

  it('kayıt kalmasa da önceki değerlendirme varsa kart görünür', async () => {
    useBackend({ records: 0, latest: () => apiOk(READY) });
    renderOwner();

    await openCard();
    expect(await screen.findByText('Risk: Orta')).toBeVisible();
  });
});
