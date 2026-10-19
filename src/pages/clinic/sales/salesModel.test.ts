import { describe, expect, it } from 'vitest';
import type { StockItem, StockSale } from '@/api/types';
import { chartTicks } from './chartScale';
import {
  canCancelSale,
  readMonth,
  readSalesFilters,
  saleFormFrom,
  salePreview,
  shiftMonth,
  toSaleRequest,
  validateSaleForm,
  validateSalesRange,
  writeSalesFilters,
} from './salesModel';

const ITEM: StockItem = {
  id: 's1',
  clinicId: 'c1',
  name: 'Kuduz aşısı 1 ml',
  category: 'VACCINE',
  unit: 'DOSE',
  quantity: 3,
  criticalLevel: 5,
  isBelowCritical: true,
  expiresAt: '',
  updatedAt: '2026-10-16T10:00:00.000Z',
  purchasePrice: 1250,
  salePrice: 2000,
};

function sale(soldAt: string, cancelledAt = ''): StockSale {
  return {
    id: 'sale-1',
    clinicId: 'c1',
    stockItemId: 's1',
    itemName: 'Kuduz aşısı 1 ml',
    category: 'VACCINE',
    unit: 'DOSE',
    quantity: 1,
    unitSalePrice: 2000,
    unitPurchasePrice: 1250,
    totalSale: 2000,
    totalCost: 1250,
    profit: 750,
    soldAt,
    cancelledAt,
  };
}

describe('satış formu', () => {
  it('kalemin satış fiyatıyla başlar', () => {
    expect(saleFormFrom(ITEM, 'tr')).toEqual({
      quantity: '1',
      unitPrice: '20,00',
    });
  });

  it.each([
    ['', 'QUANTITY_NOT_EMPTY'],
    ['1,5', 'QUANTITY_MUST_BE_NUMBER'],
    ['0', 'QUANTITY_MIN|1'],
    ['4', 'QUANTITY_MIN|0'],
    ['100001', 'QUANTITY_MAX|100000'],
  ])('miktar %s -> %s', (quantity, expected) => {
    expect(validateSaleForm({ quantity, unitPrice: '20' }, ITEM).quantity).toBe(
      expected,
    );
  });

  it('birim fiyat boş bırakılabilir; biçimi denetlenir', () => {
    expect(validateSaleForm({ quantity: '1', unitPrice: '' }, ITEM)).toEqual(
      {},
    );
    expect(
      validateSaleForm({ quantity: '1', unitPrice: '20,999' }, ITEM),
    ).toEqual({ unitPrice: 'UNIT_PRICE_WRONG DATA FORMAT' });
  });

  it('isteğe görünen fiyatı yazar; boşsa varsayılana bırakır', () => {
    expect(toSaleRequest({ quantity: ' 2 ', unitPrice: '18,50' })).toEqual({
      quantity: 2,
      unitPrice: 1850,
    });
    expect(toSaleRequest({ quantity: '2', unitPrice: '' })).toEqual({
      quantity: 2,
    });
    expect(toSaleRequest({ quantity: '2', unitPrice: '   ' })).toEqual({
      quantity: 2,
    });
  });

  it('tutar, maliyet ve kârı önizler', () => {
    expect(salePreview({ quantity: '2', unitPrice: '10' }, ITEM)).toEqual({
      total: 2000,
      cost: 2500,
      profit: -500,
    });
    expect(salePreview({ quantity: '2', unitPrice: '' }, ITEM)?.total).toBe(
      4000,
    );
    expect(salePreview({ quantity: '9', unitPrice: '10' }, ITEM)).toBeNull();
    expect(
      salePreview(
        { quantity: '1', unitPrice: '10' },
        { ...ITEM, purchasePrice: undefined },
      ),
    ).toBeNull();
  });
});

describe('satış iptali', () => {
  const now = new Date('2026-10-17T09:00:00Z');

  it('yalnızca aynı İstanbul ayında ve iptal edilmemişse', () => {
    expect(canCancelSale(sale('2026-10-01T08:00:00Z'), now)).toBe(true);
    expect(canCancelSale(sale('2026-09-30T21:30:00Z'), now)).toBe(true);
    expect(canCancelSale(sale('2026-09-30T20:59:00Z'), now)).toBe(false);
    expect(
      canCancelSale(sale('2026-10-05T08:00:00Z', '2026-10-06T08:00:00Z'), now),
    ).toBe(false);
  });
});

describe('satış filtreleri ve ay', () => {
  it('URL ile gidip gelir; geçersiz tarih yok sayılır', () => {
    const filters = { fromDate: '2026-10-01', toDate: '2026-10-17', page: 2 };
    expect(readSalesFilters(writeSalesFilters(filters))).toEqual(filters);
    expect(
      readSalesFilters(new URLSearchParams('from=2026-13-40&to=dün')),
    ).toEqual({ fromDate: '', toDate: '', page: 1 });
  });

  it('bitiş başlangıçtan önce olamaz', () => {
    expect(validateSalesRange('2026-10-10', '2026-10-09')).toBe(
      'TO_DATE_NOT_VALID',
    );
    expect(validateSalesRange('2026-10-10', '2026-10-10')).toBeNull();
    expect(validateSalesRange('', '2026-10-09')).toBeNull();
  });

  it('ay parametresi geçerli ve gelecekte değilse kullanılır', () => {
    expect(readMonth('2026-09', '2026-10')).toBe('2026-09');
    expect(readMonth('2026-11', '2026-10')).toBe('2026-10');
    expect(readMonth('2026-13', '2026-10')).toBe('2026-10');
    expect(readMonth(null, '2026-10')).toBe('2026-10');
  });

  it('ayı yıl sınırında da kaydırır', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('grafik ölçeği', () => {
  it('temiz adımlarla en büyük değeri kapsar', () => {
    expect(chartTicks(0)).toEqual([0, 10_000]);
    expect(chartTicks(37_000)).toEqual([0, 10_000, 20_000, 30_000, 40_000]);
    expect(chartTicks(90_000)).toEqual([0, 25_000, 50_000, 75_000, 100_000]);
  });
});
