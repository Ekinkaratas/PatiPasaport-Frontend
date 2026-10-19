import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { renderRoute } from '@/test/renderWithProviders';
import { GrantConsentPage } from './GrantConsentPage';

const CLINIC_ID = '3f1c2a4e-8b7d-4c1e-9a2b-1234567890ab';
const PET_ID = '9a8b7c6d-5e4f-4a3b-8c2d-0987654321fe';

const clinic = {
  id: CLINIC_ID,
  name: 'Mavi Pati Kliniği',
  taxNumber: '1234',
  phone: '+902121234567',
  email: 'info@mavipati.test',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const pet = {
  id: PET_ID,
  name: 'Pamuk',
  species: 'CAT',
  breed: 'TURKISH_VAN',
  sex: 2,
  birthDate: '',
  isBirthDateEstimated: false,
  isNeutered: false,
  ownerUserId: 'owner',
  chipNumberMasked: '',
  chipNumber: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function ok(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ data, message: 'SUCCESS', success: true }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ data: null, message, success: false }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

function useBackend(options: { clinicStatus?: number } = {}) {
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url === `/api/clinics/${CLINIC_ID}`) {
      return Promise.resolve(
        options.clinicStatus
          ? fail(options.clinicStatus, 'NOT_FOUND')
          : ok({ clinic }),
      );
    }
    if (url === '/api/pets') return Promise.resolve(ok({ pets: [pet] }));
    if (url.startsWith('/api/consents/status')) {
      return Promise.resolve(
        ok({
          consentId: '',
          status: 4,
          ownerUserId: '',
          clinicId: CLINIC_ID,
          petId: PET_ID,
          scopes: [],
          grantedAt: '',
          expiresAt: '',
          revokedAt: '',
        }),
      );
    }
    if (url === '/api/consents' && method === 'POST') {
      return Promise.resolve(ok({ consentId: 'c1', status: 1 }));
    }
    return Promise.resolve(fail(404, 'NOT_FOUND'));
  });
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(async () => {
  __resetSessionForTests();
  startSession({
    accessToken: 'AT',
    refreshExpiresIn: 43200,
    tokenType: 'Bearer',
    expiresIn: 900,
    userId: 'owner',
    clinicId: '',
  });
  await i18n.changeLanguage('tr');
});

afterEach(() => vi.unstubAllGlobals());

describe('GrantConsentPage', () => {
  it('klinik kodu biçimi hatalıysa sunucuya gitmez', async () => {
    useBackend();
    const user = userEvent.setup();
    renderRoute(<GrantConsentPage />, { path: '/panel/consents/new' });

    await user.type(screen.getByLabelText('Klinik kodu'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Kliniği bul' }));

    expect(
      await screen.findByText(/Klinik kodu geçerli biçimde değil/),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).startsWith('/api/clinics'),
      ),
    ).toBe(false);
  });

  it('bulunamayan klinik için anlaşılır mesaj gösterir', async () => {
    useBackend({ clinicStatus: 404 });
    const user = userEvent.setup();
    renderRoute(<GrantConsentPage />, { path: '/panel/consents/new' });

    await user.type(screen.getByLabelText('Klinik kodu'), CLINIC_ID);
    await user.click(screen.getByRole('button', { name: 'Kliniği bul' }));

    expect(
      await screen.findByText('Bu kodla aktif bir klinik bulunamadı.'),
    ).toBeInTheDocument();
  });

  it('klinik ve hayvan seçilince izni doğru istekle verir', async () => {
    useBackend();
    const user = userEvent.setup();
    const { router } = renderRoute(<GrantConsentPage />, {
      path: '/panel/consents/new',
      extraRoutes: [{ path: '/panel/consents', element: <p>liste</p> }],
    });

    await user.type(
      screen.getByLabelText('Klinik kodu'),
      CLINIC_ID.toUpperCase(),
    );
    await user.click(screen.getByRole('button', { name: 'Kliniği bul' }));
    expect(await screen.findByText('Mavi Pati Kliniği')).toBeInTheDocument();

    await user.click(await screen.findByText('Pamuk'));
    await user.click(
      await screen.findByRole('checkbox', { name: /Aşı geçmişini görme/ }),
    );
    await user.click(screen.getByRole('radio', { name: '1 hafta' }));
    await user.click(screen.getByRole('button', { name: 'İzni ver' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/panel/consents'),
    );
    const grantCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === '/api/consents' &&
        (init as RequestInit | undefined)?.method === 'POST',
    )!;
    const body = JSON.parse((grantCall[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      clinicId: CLINIC_ID,
      petId: PET_ID,
      scopes: ['vaccination_read'],
    });
    expect(body.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T23:59:59\+03:00$/);
  });

  it('kapsam seçilmeden gönderilmez', async () => {
    useBackend();
    const user = userEvent.setup();
    renderRoute(<GrantConsentPage />, {
      path: '/panel/consents/new',
      initialEntry: `/panel/consents/new?clinic=${CLINIC_ID}&pet=${PET_ID}`,
    });

    await user.click(await screen.findByRole('button', { name: 'İzni ver' }));

    expect(
      await screen.findByText('En az bir bilgi türü seçin.'),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url) === '/api/consents' &&
          (init as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(false);
  });
});
