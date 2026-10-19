import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { Clinic, StockItem } from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { FlashBanner } from '@/components/layout/FlashBanner';
import { dismissFlash } from '@/lib/flash';
import { StockPage } from './StockPage';

const CLINIC_ID = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const VACCINE_ID = '0f8c7a51-7f0e-4c43-9a55-5d3f8f1a2b01';
const PILL_ID = '7a1d2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d';

const CLINIC = { id: CLINIC_ID, name: 'Pati Test Kliniği' } as Clinic;

let items: StockItem[];
let fetchMock: ReturnType<typeof vi.fn>;

function stockItem(overrides: Partial<StockItem>): StockItem {
  return {
    id: VACCINE_ID,
    clinicId: CLINIC_ID,
    name: 'Kuduz aşısı 1 ml',
    category: 'VACCINE',
    unit: 'DOSE',
    quantity: 3,
    criticalLevel: 5,
    isBelowCritical: true,
    expiresAt: '2027-03-01T00:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
    purchasePrice: 1250,
    salePrice: 2000,
    ...overrides,
  };
}

function withCritical(item: StockItem): StockItem {
  return { ...item, isBelowCritical: item.quantity < item.criticalLevel };
}

function respond(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function ok(data: unknown) {
  return respond(200, { data, message: 'SUCCESS', success: true });
}

function fail(status: number, message: string) {
  return respond(status, { data: null, message, success: false });
}

function useBackend(
  override?: (url: string, method: string) => Promise<Response> | undefined,
) {
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const custom = override?.(url, method);
    if (custom) return custom;
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const base = `/api/clinics/${CLINIC_ID}/stock-items`;

    if (method === 'GET' && url.startsWith(`${base}?`)) {
      return ok({ items, total: items.length, page: 1, pageSize: 16 });
    }
    const match = url.match(
      new RegExp(`^${base}/([0-9a-f-]+)(/adjust|/sales)?$`),
    );
    const index = match ? items.findIndex((item) => item.id === match[1]) : -1;
    if (!match || index === -1) return fail(404, 'NOT_FOUND');
    const current = items[index]!;

    if (method === 'POST' && match[2] === '/sales') {
      if (body.quantity > current.quantity) return fail(400, 'QUANTITY_MIN|0');
      const next = withCritical({
        ...current,
        quantity: current.quantity - body.quantity,
      });
      items[index] = next;
      const unitSalePrice = body.unitPrice ?? current.salePrice;
      return respond(201, {
        data: {
          sale: {
            id: 'sale-1',
            itemName: current.name,
            unit: current.unit,
            quantity: body.quantity,
            unitSalePrice,
            totalSale: body.quantity * unitSalePrice,
          },
          item: next,
        },
        message: 'CREATED',
        success: true,
      });
    }
    if (method === 'POST' && match[2]) {
      const next = withCritical({
        ...current,
        quantity: current.quantity + body.delta,
      });
      items[index] = next;
      return ok({ item: next });
    }
    if (method === 'PATCH') {
      const next = withCritical({
        ...current,
        ...body,
        expiresAt:
          body.expiresAt === null ? '' : (body.expiresAt ?? current.expiresAt),
      });
      items[index] = next;
      return ok({ item: next });
    }
    if (method === 'DELETE') {
      items.splice(index, 1);
      return ok({ item: current });
    }
    return fail(404, 'NOT_FOUND');
  });
  vi.stubGlobal('fetch', fetchMock);
}

function callsWith(method: string) {
  return fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? 'GET') === method)
    .map(([url, init]) => ({
      url: String(url),
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    }));
}

function renderStock() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <FlashBanner />
            <Outlet context={{ clinic: CLINIC }} />
          </>
        ),
        children: [{ path: '/clinic/stock', element: <StockPage /> }],
      },
    ],
    { initialEntries: ['/clinic/stock'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function rowOf(name: string) {
  return screen.getByText(name).closest('li')!;
}

beforeEach(async () => {
  __resetSessionForTests();
  dismissFlash();
  startSession({
    accessToken: 'AT',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresIn: 43200,
    userId: 'clinic-user',
    clinicId: CLINIC_ID,
  });
  items = [
    stockItem({}),
    stockItem({
      id: PILL_ID,
      name: 'Amoksisilin 250 mg',
      category: 'MEDICINE',
      unit: 'TABLET',
      quantity: 0,
      criticalLevel: 0,
      isBelowCritical: false,
      expiresAt: '',
      purchasePrice: undefined,
      salePrice: undefined,
    }),
  ];
  await i18n.changeLanguage('tr');
});

afterEach(() => vi.unstubAllGlobals());

describe('StockPage — hızlı miktar', () => {
  it('−1 isteği gönderir ve yeni miktarı gösterir', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', {
        name: 'Kuduz aşısı 1 ml miktarını 1 azalt',
      }),
    );

    await waitFor(() =>
      expect(within(rowOf('Kuduz aşısı 1 ml')).getByText('2')).toBeVisible(),
    );
    expect(callsWith('POST')).toEqual([
      {
        url: `/api/clinics/${CLINIC_ID}/stock-items/${VACCINE_ID}/adjust`,
        body: { delta: -1 },
      },
    ]);
  });

  it('miktar 0 iken −1 kapalıdır', async () => {
    useBackend();
    renderStock();
    expect(
      await screen.findByRole('button', {
        name: 'Amoksisilin 250 mg miktarını 1 azalt',
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'Amoksisilin 250 mg miktarını 1 artır',
      }),
    ).toBeEnabled();
  });

  it('sunucu sınır hatasını satırda gösterir', async () => {
    useBackend((_url, method) =>
      method === 'POST' ? fail(400, 'QUANTITY_MIN|0') : undefined,
    );
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', {
        name: 'Kuduz aşısı 1 ml miktarını 1 azalt',
      }),
    );

    expect(
      await within(rowOf('Kuduz aşısı 1 ml')).findByRole('alert'),
    ).toHaveTextContent("Stok yetersiz: miktar 0'ın altına düşemez.");
  });

  it('artık yalnızca ekleme notu gösterilmez', async () => {
    useBackend();
    renderStock();
    await screen.findByText('Kuduz aşısı 1 ml');
    expect(screen.queryByText(/yalnızca eklenebilir/)).not.toBeInTheDocument();
  });
});

describe('StockPage — miktar değiştir', () => {
  it('stoğa ekleme pozitif delta gönderir', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', {
        name: 'Miktar değiştir: Kuduz aşısı 1 ml',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Miktar değiştir' });
    await user.click(within(dialog).getByLabelText('Stoğa ekle'));
    await user.type(within(dialog).getByLabelText('Miktar'), '10');
    expect(within(dialog).getByText('13 Doz')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    expect(
      await screen.findByText('Kuduz aşısı 1 ml: yeni miktar 13 Doz.'),
    ).toBeVisible();
    expect(callsWith('POST').at(-1)?.body).toEqual({ delta: 10 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stokta olandan fazlası düşülemez; istek gönderilmez', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', {
        name: 'Miktar değiştir: Kuduz aşısı 1 ml',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Miktar değiştir' });
    await user.type(within(dialog).getByLabelText('Miktar'), '4');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    expect(
      within(dialog).getByText("Stok yetersiz: miktar 0'ın altına düşemez."),
    ).toBeVisible();
    expect(callsWith('POST')).toHaveLength(0);
  });
});

describe('StockPage — düzenle', () => {
  it('yalnızca değişen alanları gönderir; tarih kaldırılınca null', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', { name: 'Düzenle: Kuduz aşısı 1 ml' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Ürünü düzenle' });
    const critical = within(dialog).getByLabelText('Kritik seviye');
    await user.clear(critical);
    await user.type(critical, '2');
    await user.click(
      within(dialog).getByRole('button', { name: 'Tarihi kaldır' }),
    );
    expect(within(dialog).getByLabelText('Son kullanma tarihi')).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    expect(
      await screen.findByText('Kuduz aşısı 1 ml güncellendi.'),
    ).toBeVisible();
    expect(callsWith('PATCH')).toEqual([
      {
        url: `/api/clinics/${CLINIC_ID}/stock-items/${VACCINE_ID}`,
        body: { criticalLevel: 2, expiresAt: null },
      },
    ]);
  });

  it('sunucu fiyatı reddederse hatayı fiyat alanında gösterir', async () => {
    useBackend((_url, method) =>
      method === 'PATCH' ? fail(400, 'SALE_PRICE_MUST_BE_NUMBER') : undefined,
    );
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', { name: 'Düzenle: Kuduz aşısı 1 ml' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Ürünü düzenle' });
    const salePrice = within(dialog).getByLabelText('Satış fiyatı (₺)');
    await user.clear(salePrice);
    await user.type(salePrice, '22');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    expect(
      await within(dialog).findByText(
        'Satış fiyatı geçerli bir tutar olmalıdır.',
      ),
    ).toBeVisible();
    expect(salePrice).toHaveAttribute('aria-invalid', 'true');
    expect(callsWith('PATCH')[0]?.body).toEqual({ salePrice: 2200 });
  });

  it('değişiklik yoksa istek gönderilmez', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', { name: 'Düzenle: Kuduz aşısı 1 ml' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Ürünü düzenle' });
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    expect(
      within(dialog).getByText('Kaydedilecek bir değişiklik yok.'),
    ).toBeVisible();
    expect(callsWith('PATCH')).toHaveLength(0);
  });
});

describe('StockPage — sil', () => {
  it('onaydan sonra siler ve listeden kaldırır', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', { name: 'Sil: Amoksisilin 250 mg' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Ürünü sil' });
    expect(dialog).toHaveTextContent(
      '"Amoksisilin 250 mg" stoktan kalıcı olarak silinecek.',
    );
    expect(callsWith('DELETE')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }));

    expect(
      await screen.findByText('Amoksisilin 250 mg stoktan silindi.'),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Sil: Amoksisilin 250 mg' }),
      ).not.toBeInTheDocument(),
    );
    expect(callsWith('DELETE')).toEqual([
      {
        url: `/api/clinics/${CLINIC_ID}/stock-items/${PILL_ID}`,
        body: undefined,
      },
    ]);
  });
});

describe('StockPage — satış', () => {
  it('fiyatları gösterir; fiyatsız kalem satılamaz ve nedenini söyler', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await screen.findByText('Kuduz aşısı 1 ml');
    expect(
      within(rowOf('Kuduz aşısı 1 ml')).getByText('Alış ₺12,50 · Satış ₺20,00'),
    ).toBeVisible();
    expect(
      within(rowOf('Amoksisilin 250 mg')).getByText('Fiyat girilmemiş'),
    ).toBeVisible();
    const blocked = screen.getByRole('button', {
      name: 'Sat: Amoksisilin 250 mg',
    });
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(blocked).toHaveAccessibleDescription('Satış için önce fiyat girin');
    expect(
      screen.getByLabelText('Satılacak miktar: Amoksisilin 250 mg'),
    ).toBeDisabled();
    await user.click(blocked);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('miktar ve birim fiyatla satış kaydeder, stoğu günceller', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    const rowQuantity = await screen.findByLabelText(
      'Satılacak miktar: Kuduz aşısı 1 ml',
    );
    expect(rowQuantity).toHaveValue(1);
    await user.clear(rowQuantity);
    await user.type(rowQuantity, '2');
    await user.click(
      screen.getByRole('button', { name: 'Sat: Kuduz aşısı 1 ml' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Satış yap' });
    const quantity = within(dialog).getByLabelText('Satılan miktar');
    const price = within(dialog).getByLabelText('Birim fiyat (₺)');
    expect(quantity).toHaveValue(2);
    expect(price).toHaveValue('20,00');
    await user.clear(price);
    await user.type(price, '18,5');
    expect(within(dialog).getByText('₺37,00')).toBeVisible();
    expect(within(dialog).getByText('₺25,00')).toBeVisible();
    expect(within(dialog).getByText('₺12,00')).toBeVisible();
    await user.click(
      within(dialog).getByRole('button', { name: 'Satışı kaydet' }),
    );

    expect(
      await screen.findByText('Kuduz aşısı 1 ml: 2 Doz satıldı (₺37,00).'),
    ).toBeVisible();
    expect(callsWith('POST')).toEqual([
      {
        url: `/api/clinics/${CLINIC_ID}/stock-items/${VACCINE_ID}/sales`,
        body: { quantity: 2, unitPrice: 1850 },
      },
    ]);
    await waitFor(() =>
      expect(within(rowOf('Kuduz aşısı 1 ml')).getByText('1')).toBeVisible(),
    );
  });

  it('stoktakinden fazlası satılamaz; istek gönderilmez', async () => {
    useBackend();
    const user = userEvent.setup();
    renderStock();

    await user.click(
      await screen.findByRole('button', { name: 'Sat: Kuduz aşısı 1 ml' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Satış yap' });
    const quantity = within(dialog).getByLabelText('Satılan miktar');
    await user.clear(quantity);
    await user.type(quantity, '4');
    await user.click(
      within(dialog).getByRole('button', { name: 'Satışı kaydet' }),
    );

    expect(
      within(dialog).getByText("Stok yetersiz: miktar 0'ın altına düşemez."),
    ).toBeVisible();
    expect(callsWith('POST')).toHaveLength(0);
  });
});
