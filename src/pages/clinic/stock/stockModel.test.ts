import { describe, expect, it } from 'vitest';
import type { StockItem } from '@/api/types';
import {
  canStep,
  emptyStockForm,
  expiryState,
  hasPrices,
  readStockFilters,
  stockEditFormFrom,
  toAddStockRequest,
  toStockDelta,
  toUpdateStockRequest,
  validateStockAdjust,
  validateStockEdit,
  validateStockForm,
  writeStockFilters,
} from './stockModel';

const TODAY = '2026-10-16';

function item(expiresAt: string): StockItem {
  return {
    id: 's1',
    clinicId: 'c1',
    name: 'Kuduz aşısı',
    category: 'VACCINE',
    unit: 'DOSE',
    quantity: 3,
    criticalLevel: 5,
    isBelowCritical: true,
    expiresAt,
    updatedAt: '2026-10-16T10:00:00.000Z',
  };
}

describe('stok formu', () => {
  it('zorunlu alanları ister', () => {
    expect(validateStockForm(emptyStockForm(), TODAY)).toEqual({
      name: 'STOCK_NAME_NOT_EMPTY',
      category: 'CATEGORY_NOT_EMPTY',
      unit: 'UNIT_NOT_EMPTY',
      quantity: 'QUANTITY_NOT_EMPTY',
      purchasePrice: 'PURCHASE_PRICE_NOT_EMPTY',
      salePrice: 'SALE_PRICE_NOT_EMPTY',
    });
  });

  it('geçerli formu isteğe çevirir; boş tarih gönderilmez', () => {
    const values = {
      name: '  Kuduz   aşısı 1 ml ',
      category: 'VACCINE',
      unit: 'DOSE',
      quantity: ' 12 ',
      criticalLevel: '5',
      expiresAt: '',
      purchasePrice: ' 12,5 ',
      salePrice: '20',
    };
    expect(validateStockForm(values, TODAY)).toEqual({});
    expect(toAddStockRequest(values)).toEqual({
      name: 'Kuduz aşısı 1 ml',
      category: 'VACCINE',
      unit: 'DOSE',
      quantity: 12,
      criticalLevel: 5,
      purchasePrice: 1250,
      salePrice: 2000,
    });
    expect(
      toAddStockRequest({ ...values, expiresAt: '2027-01-01' }).expiresAt,
    ).toBe('2027-01-01');
  });

  it('geçersiz fiyat hiçbir zaman 0 olarak gönderilmez', () => {
    const request = toAddStockRequest({
      ...emptyStockForm(),
      name: 'Mama',
      category: 'FOOD',
      unit: 'BOX',
      quantity: '1',
      purchasePrice: '',
      salePrice: 'abc',
    });
    expect(JSON.parse(JSON.stringify(request))).toMatchObject({
      purchasePrice: null,
      salePrice: null,
    });
  });

  it('listede olmayan kategori ve birimi reddeder', () => {
    expect(
      validateStockForm(
        {
          ...emptyStockForm(),
          name: 'Mama',
          category: 'TOYS',
          unit: 'KG',
          quantity: '1',
          purchasePrice: '1',
          salePrice: '2',
        },
        TODAY,
      ),
    ).toEqual({ category: 'CATEGORY_NOT_VALID', unit: 'UNIT_NOT_VALID' });
  });
});

describe('son kullanma durumu', () => {
  it.each([
    ['', null],
    ['2026-10-15', 'expired'],
    ['2026-10-16', 'soon'],
    ['2026-11-15', 'soon'],
    ['2026-11-16', null],
  ])('%s -> %s', (expiresAt, expected) => {
    expect(expiryState(item(expiresAt), TODAY)).toBe(expected);
  });
});

describe('stok filtreleri', () => {
  it('URL ile gidip gelir, geçersiz kategori yok sayılır', () => {
    const filters = {
      category: 'MEDICINE' as const,
      onlyBelowCritical: true,
      page: 2,
    };
    expect(readStockFilters(writeStockFilters(filters))).toEqual(filters);
    expect(
      readStockFilters(new URLSearchParams('category=X&critical=yes')),
    ).toEqual({
      category: '',
      onlyBelowCritical: false,
      page: 1,
    });
  });
});

describe('stok düzenleme', () => {
  const current = {
    ...item('2026-11-05T00:00:00.000Z'),
    name: 'Kuduz aşısı 1 ml',
    purchasePrice: 1250,
    salePrice: 2000,
  };

  it('formu kayıttan doldurur', () => {
    expect(stockEditFormFrom(current, 'tr')).toEqual({
      name: 'Kuduz aşısı 1 ml',
      quantity: '3',
      criticalLevel: '5',
      expiresAt: '2026-11-05',
      purchasePrice: '12,50',
      salePrice: '20,00',
    });
    expect(stockEditFormFrom(current, 'en').salePrice).toBe('20.00');
    expect(stockEditFormFrom(item(''), 'tr')).toMatchObject({
      expiresAt: '',
      purchasePrice: '',
      salePrice: '',
    });
  });

  it('yalnızca değişen alanları gönderir', () => {
    const values = stockEditFormFrom(current, 'tr');
    expect(toUpdateStockRequest(values, current)).toEqual({});
    expect(
      toUpdateStockRequest(
        { ...values, name: ' Kuduz  aşısı 2 ml ', quantity: '10' },
        current,
      ),
    ).toEqual({ name: 'Kuduz aşısı 2 ml', quantity: 10 });
    expect(
      toUpdateStockRequest({ ...values, criticalLevel: '0' }, current),
    ).toEqual({ criticalLevel: 0 });
  });

  it('tarih boşaltılırsa null gönderilir', () => {
    const values = { ...stockEditFormFrom(current, 'tr'), expiresAt: '' };
    expect(toUpdateStockRequest(values, current)).toEqual({ expiresAt: null });
  });

  it('değişmeyen geçmiş tarih hata vermez, yeni geçmiş tarih verir', () => {
    const expired = item('2026-10-01T00:00:00.000Z');
    const values = stockEditFormFrom(expired, 'tr');
    expect(validateStockEdit(values, expired, TODAY)).toEqual({});
    expect(
      validateStockEdit({ ...values, expiresAt: '2026-10-10' }, expired, TODAY),
    ).toEqual({ expiresAt: 'EXPIRES_AT_CANNOT_BE_PAST' });
  });

  it('miktar ve ad kurallarını uygular', () => {
    const values = {
      ...stockEditFormFrom(current, 'tr'),
      name: '  ',
      quantity: '-1',
      criticalLevel: '100001',
    };
    expect(validateStockEdit(values, current, TODAY)).toEqual({
      name: 'STOCK_NAME_NOT_EMPTY',
      quantity: 'QUANTITY_MUST_BE_NUMBER',
      criticalLevel: 'CRITICAL_LEVEL_MAX|100000',
    });
  });

  it('değişen fiyatı kuruş olarak gönderir; aynı tutar gönderilmez', () => {
    const values = stockEditFormFrom(current, 'tr');
    expect(
      toUpdateStockRequest({ ...values, purchasePrice: '12.5' }, current),
    ).toEqual({});
    expect(
      toUpdateStockRequest(
        { ...values, purchasePrice: '13', salePrice: '21,99' },
        current,
      ),
    ).toEqual({ purchasePrice: 1300, salePrice: 2199 });
  });

  it('girilmiş fiyat silinemez; fiyatsız kalemde boş bırakılabilir', () => {
    const values = { ...stockEditFormFrom(current, 'tr'), salePrice: ' ' };
    expect(validateStockEdit(values, current, TODAY)).toEqual({
      salePrice: 'SALE_PRICE_NOT_EMPTY',
    });
    expect(toUpdateStockRequest(values, current)).not.toHaveProperty(
      'salePrice',
    );
    const legacy = item('');
    const legacyValues = stockEditFormFrom(legacy, 'tr');
    expect(validateStockEdit(legacyValues, legacy, TODAY)).toEqual({});
    expect(toUpdateStockRequest(legacyValues, legacy)).toEqual({});
    expect(
      toUpdateStockRequest({ ...legacyValues, purchasePrice: '0' }, legacy),
    ).toEqual({ purchasePrice: 0 });
  });

  it('fiyat biçimini ve üst sınırı denetler', () => {
    const values = stockEditFormFrom(current, 'tr');
    expect(
      validateStockEdit(
        { ...values, purchasePrice: '1.000,50', salePrice: '10000000,01' },
        current,
        TODAY,
      ),
    ).toEqual({
      purchasePrice: 'PURCHASE_PRICE_WRONG DATA FORMAT',
      salePrice: 'SALE_PRICE_MAX|1000000000',
    });
  });

  it('iki fiyatı da olan kalem satılabilir', () => {
    expect(hasPrices(current)).toBe(true);
    expect(hasPrices({ ...current, salePrice: undefined })).toBe(false);
    expect(hasPrices({ ...current, purchasePrice: 0 })).toBe(true);
  });
});

describe('stok miktar değişikliği', () => {
  const current = { ...item(''), quantity: 3 };

  it.each([
    ['remove', '', 'DELTA_NOT_EMPTY'],
    ['remove', '1.5', 'DELTA_MUST_BE_NUMBER'],
    ['remove', '-2', 'DELTA_MUST_BE_NUMBER'],
    ['add', '0', 'DELTA_NOT_VALID'],
    ['remove', '4', 'QUANTITY_MIN|0'],
    ['add', '99998', 'QUANTITY_MAX|100000'],
    ['remove', '3', null],
    ['add', '99997', null],
  ] as const)('%s %s -> %s', (direction, raw, expected) => {
    expect(validateStockAdjust(direction, raw, current)).toBe(expected);
  });

  it('yöne göre işaretli delta üretir', () => {
    expect(toStockDelta('remove', ' 2 ')).toBe(-2);
    expect(toStockDelta('add', '5')).toBe(5);
  });

  it('hızlı adım sınırları korur', () => {
    expect(canStep({ ...current, quantity: 0 }, -1)).toBe(false);
    expect(canStep({ ...current, quantity: 0 }, 1)).toBe(true);
    expect(canStep({ ...current, quantity: 100_000 }, 1)).toBe(false);
  });
});
