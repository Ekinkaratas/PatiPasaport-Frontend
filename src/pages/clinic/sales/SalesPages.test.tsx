import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type {
  Clinic,
  DailySales,
  StockSale,
  StockSalesSummary,
} from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { FlashBanner } from '@/components/layout/FlashBanner';
import { dismissFlash } from '@/lib/flash';
import { monthInBusinessTimeZone } from '@/lib/format';
import { SalesHistoryPage } from './SalesHistoryPage';
import { SalesReportPage } from './SalesReportPage';
import { shiftMonth } from './salesModel';

const CLINIC_ID = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const CLINIC = { id: CLINIC_ID, name: 'Pati Test Kliniği' } as Clinic;
const BASE = `/api/clinics/${CLINIC_ID}/stock-sales`;

let fetchMock: ReturnType<typeof vi.fn>;
let sales: StockSale[];

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

function sale(overrides: Partial<StockSale>): StockSale {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    clinicId: CLINIC_ID,
    stockItemId: '0f8c7a51-7f0e-4c43-9a55-5d3f8f1a2b01',
    itemName: 'Kuduz aşısı 1 ml',
    category: 'VACCINE',
    unit: 'DOSE',
    quantity: 1,
    unitSalePrice: 2000,
    unitPurchasePrice: 1250,
    totalSale: 2000,
    totalCost: 1250,
    profit: 750,
    soldAt: new Date().toISOString(),
    cancelledAt: '',
    ...overrides,
  };
}

function daysOf(month: string): DailySales[] {
  const [year = 0, index = 1] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return Array.from({ length: count }, (_, day) => ({
    date: `${month}-${String(day + 1).padStart(2, '0')}`,
    revenue: 0,
    cost: 0,
    profit: 0,
    salesCount: 0,
    quantity: 0,
  }));
}

function summaryOf(month: string, empty: boolean): StockSalesSummary {
  const daily = daysOf(month);
  if (!empty) {
    daily[0] = {
      ...daily[0]!,
      revenue: 30_000,
      cost: 20_000,
      profit: 10_000,
      salesCount: 2,
      quantity: 3,
    };
    daily[1] = {
      ...daily[1]!,
      revenue: 7_000,
      cost: 4_000,
      profit: 3_000,
      salesCount: 1,
      quantity: 1,
    };
  }
  const totals = daily.reduce(
    (sum, day) => ({
      revenue: sum.revenue + day.revenue,
      cost: sum.cost + day.cost,
      profit: sum.profit + day.profit,
      salesCount: sum.salesCount + day.salesCount,
      quantity: sum.quantity + day.quantity,
    }),
    { revenue: 0, cost: 0, profit: 0, salesCount: 0, quantity: 0 },
  );
  return {
    month,
    totals,
    daily,
    weekly: [
      { weekStart: `${month}-01`, weekEnd: `${month}-07`, ...totals },
      {
        weekStart: `${month}-08`,
        weekEnd: `${month}-14`,
        revenue: 0,
        cost: 0,
        profit: 0,
        salesCount: 0,
        quantity: 0,
      },
    ],
    products: empty
      ? []
      : [
          {
            stockItemId: '0f8c7a51-7f0e-4c43-9a55-5d3f8f1a2b01',
            itemName: 'Kuduz aşısı 1 ml',
            unit: 'DOSE',
            revenue: 30_000,
            cost: 20_000,
            profit: 10_000,
            salesCount: 2,
            quantity: 3,
          },
          {
            stockItemId: '',
            itemName: 'Eski mama',
            unit: 'BOX',
            revenue: 7_000,
            cost: 4_000,
            profit: 3_000,
            salesCount: 1,
            quantity: 1,
          },
        ],
  };
}

function useBackend({ emptyMonths = [] as string[], cancelStatus = 200 } = {}) {
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url.startsWith(`${BASE}/summary?`)) {
      const month = new URL(url, 'http://x').searchParams.get('month') ?? '';
      return ok(summaryOf(month, emptyMonths.includes(month)));
    }
    if (method === 'GET' && url.startsWith(`${BASE}?`)) {
      return ok({ sales, total: sales.length, page: 1, pageSize: 16 });
    }
    const cancel = url.match(new RegExp(`^${BASE}/([0-9a-f-]+)/cancel$`));
    if (method === 'POST' && cancel) {
      if (cancelStatus !== 200) return fail(cancelStatus, 'CONFLICT');
      const index = sales.findIndex((entry) => entry.id === cancel[1]);
      sales[index] = {
        ...sales[index]!,
        cancelledAt: new Date().toISOString(),
      };
      return ok({ sale: sales[index], item: null });
    }
    return fail(404, 'NOT_FOUND');
  });
  vi.stubGlobal('fetch', fetchMock);
}

function requestedUrls() {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

function renderAt(path: string) {
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
        children: [
          { path: '/clinic/sales', element: <SalesReportPage /> },
          { path: '/clinic/sales/history', element: <SalesHistoryPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
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
  sales = [
    sale({}),
    sale({
      id: '22222222-2222-4222-8222-222222222222',
      itemName: 'Amoksisilin 250 mg',
      unit: 'TABLET',
      quantity: 2,
      totalSale: 3000,
      profit: -200,
      soldAt: new Date(Date.now() - 70 * 86_400_000).toISOString(),
    }),
    sale({
      id: '33333333-3333-4333-8333-333333333333',
      itemName: 'Eldiven',
      unit: 'BOX',
      stockItemId: '',
      cancelledAt: new Date().toISOString(),
    }),
  ];
  await i18n.changeLanguage('tr');
});

afterEach(() => vi.unstubAllGlobals());

describe('SalesHistoryPage', () => {
  it('satışları listeler; iptal yalnızca bu ayın satışında mümkündür', async () => {
    useBackend();
    renderAt('/clinic/sales/history');

    const recent = (await screen.findByText('Kuduz aşısı 1 ml')).closest('li')!;
    expect(within(recent).getByText('₺20,00')).toBeVisible();
    expect(within(recent).getByText('₺7,50')).toBeVisible();
    expect(
      within(recent).getByRole('button', {
        name: 'Satışı iptal et: Kuduz aşısı 1 ml',
      }),
    ).toBeVisible();

    const old = screen.getByText('Amoksisilin 250 mg').closest('li')!;
    expect(within(old).getByText('-₺2,00')).toBeVisible();
    expect(within(old).queryByRole('button')).not.toBeInTheDocument();

    const cancelled = screen.getByText('Eldiven').closest('li')!;
    expect(within(cancelled).getByText(/^İptal edildi · /)).toBeVisible();
    expect(within(cancelled).getByText('Silinmiş ürün')).toBeVisible();
    expect(within(cancelled).queryByRole('button')).not.toBeInTheDocument();
  });

  it('onaydan sonra satışı iptal eder', async () => {
    useBackend();
    const user = userEvent.setup();
    renderAt('/clinic/sales/history');

    await user.click(
      await screen.findByRole('button', {
        name: 'Satışı iptal et: Kuduz aşısı 1 ml',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Satışı iptal et' });
    expect(dialog).toHaveTextContent(
      '1 Doz stoğa geri eklenecek ve satış raporlardan çıkarılacak.',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Satışı iptal et' }),
    );

    expect(
      await screen.findByText('Kuduz aşısı 1 ml satışı iptal edildi.'),
    ).toBeVisible();
    expect(requestedUrls()).toContain(
      `${BASE}/11111111-1111-4111-8111-111111111111/cancel`,
    );
  });

  it('iptal reddedilirse nedenini gösterir', async () => {
    useBackend({ cancelStatus: 409 });
    const user = userEvent.setup();
    renderAt('/clinic/sales/history');

    await user.click(
      await screen.findByRole('button', {
        name: 'Satışı iptal et: Kuduz aşısı 1 ml',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Satışı iptal et' });
    const submit = within(dialog).getByRole('button', {
      name: 'Satışı iptal et',
    });
    await user.click(submit);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Bu satış artık iptal edilemiyor',
    );
    expect(submit).toBeDisabled();
  });

  it('tarih aralığını denetler ve filtreyi isteğe ekler', async () => {
    useBackend();
    const user = userEvent.setup();
    renderAt('/clinic/sales/history');
    await screen.findByText('Kuduz aşısı 1 ml');

    fireEvent.change(screen.getByLabelText('Başlangıç'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(screen.getByLabelText('Bitiş'), {
      target: { value: '2026-10-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Filtrele' }));
    expect(
      screen.getByText('Bitiş tarihi başlangıç tarihinden önce olamaz.'),
    ).toBeVisible();
    expect(requestedUrls().some((url) => url.includes('fromDate'))).toBe(false);

    fireEvent.change(screen.getByLabelText('Bitiş'), {
      target: { value: '2026-10-12' },
    });
    await user.click(screen.getByRole('button', { name: 'Filtrele' }));
    await waitFor(() =>
      expect(requestedUrls()).toContain(
        `${BASE}?page=1&pageSize=16&fromDate=2026-10-10&toDate=2026-10-12`,
      ),
    );
  });
});

describe('SalesReportPage', () => {
  const current = monthInBusinessTimeZone();

  it('ay toplamlarını, haftaları ve ürünleri gösterir', async () => {
    useBackend();
    renderAt('/clinic/sales');

    const revenueTile = (await screen.findByText('Ciro', { selector: 'p' }))
      .parentElement!;
    expect(within(revenueTile).getByText('₺370,00')).toBeVisible();
    expect(screen.getByText('Kâr marjı %35,1')).toBeVisible();
    expect(requestedUrls()).toContain(`${BASE}/summary?month=${current}`);

    const weekly = screen.getByRole('table', { name: 'Haftalık özet' });
    expect(within(weekly).getAllByRole('row')).toHaveLength(3);

    const products = screen.getByRole('table', { name: 'Ürün bazında' });
    expect(within(products).getByText('3 Doz')).toBeVisible();
    expect(within(products).getByText('Silinmiş ürün')).toBeVisible();
  });

  it('grafiği tabloya çevirir', async () => {
    useBackend();
    const user = userEvent.setup();
    renderAt('/clinic/sales');

    await user.click(
      await screen.findByRole('button', { name: 'Tablo olarak göster' }),
    );
    const daily = screen.getByRole('table', { name: 'Günlük ciro' });
    expect(within(daily).getAllByRole('row')).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: 'Grafik olarak göster' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('önceki aya geçer; gelecek aya geçilemez; boş ay bildirilir', async () => {
    const previous = shiftMonth(current, -1);
    useBackend({ emptyMonths: [previous] });
    const user = userEvent.setup();
    renderAt('/clinic/sales');

    expect(
      await screen.findByRole('button', { name: 'Sonraki ay' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Önceki ay' }));

    expect(await screen.findByText('Bu ay satış yok.')).toBeVisible();
    expect(requestedUrls()).toContain(`${BASE}/summary?month=${previous}`);
    expect(screen.getByRole('button', { name: 'Sonraki ay' })).toBeEnabled();
  });
});
