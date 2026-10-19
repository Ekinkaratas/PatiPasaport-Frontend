import type {
  AddStockItemRequest,
  StockItem,
  UpdateStockItemRequest,
} from '@/api/types';
import {
  STOCK_CATEGORIES,
  STOCK_UNITS,
  type StockCategory,
} from '@/domain/constants';
import {
  normalizeWhitespace,
  STOCK_AMOUNT_MAX,
  validateStockAmount,
  validateStockExpiry,
  validateStockName,
  validateStockPrice,
  type StockPricePrefix,
  type ValidationCode,
} from '@/domain/validation';
import { addDays } from '@/lib/consentExpiry';
import { parseMoney, toMoneyInput } from '@/lib/money';
import { parsePage } from '@/lib/pagination';

export interface StockFormValues {
  name: string;
  category: string;
  unit: string;
  quantity: string;
  criticalLevel: string;
  expiresAt: string;
  purchasePrice: string;
  salePrice: string;
}

export type StockFormField = keyof StockFormValues;

export function emptyStockForm(): StockFormValues {
  return {
    name: '',
    category: '',
    unit: '',
    quantity: '',
    criticalLevel: '0',
    expiresAt: '',
    purchasePrice: '',
    salePrice: '',
  };
}

export function validateStockForm(
  values: StockFormValues,
  today: string,
): Partial<Record<StockFormField, string>> {
  const errors: Partial<Record<StockFormField, string>> = {};
  const set = (field: StockFormField, code: string | null) => {
    if (code) errors[field] = code;
  };
  set('name', validateStockName(values.name));
  if (!values.category) set('category', 'CATEGORY_NOT_EMPTY');
  else if (!(STOCK_CATEGORIES as readonly string[]).includes(values.category)) {
    set('category', 'CATEGORY_NOT_VALID');
  }
  if (!values.unit) set('unit', 'UNIT_NOT_EMPTY');
  else if (!(STOCK_UNITS as readonly string[]).includes(values.unit)) {
    set('unit', 'UNIT_NOT_VALID');
  }
  set('quantity', validateStockAmount('QUANTITY', values.quantity));
  set(
    'criticalLevel',
    validateStockAmount('CRITICAL_LEVEL', values.criticalLevel),
  );
  set('expiresAt', validateStockExpiry(values.expiresAt, today));
  set(
    'purchasePrice',
    validateStockPrice('PURCHASE_PRICE', values.purchasePrice),
  );
  set('salePrice', validateStockPrice('SALE_PRICE', values.salePrice));
  return errors;
}

export function toAddStockRequest(
  values: StockFormValues,
): AddStockItemRequest {
  return {
    name: normalizeWhitespace(values.name),
    category: values.category,
    unit: values.unit,
    quantity: Number(values.quantity.trim()),
    criticalLevel: Number(values.criticalLevel.trim()),
    ...(values.expiresAt ? { expiresAt: values.expiresAt } : {}),
    purchasePrice: parseMoney(values.purchasePrice) ?? Number.NaN,
    salePrice: parseMoney(values.salePrice) ?? Number.NaN,
  };
}

export interface StockEditValues {
  name: string;
  quantity: string;
  criticalLevel: string;
  expiresAt: string;
  purchasePrice: string;
  salePrice: string;
}

export type StockEditField = keyof StockEditValues;

export function stockEditFormFrom(
  item: StockItem,
  language: string,
): StockEditValues {
  return {
    name: item.name,
    quantity: String(item.quantity),
    criticalLevel: String(item.criticalLevel),
    expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '',
    purchasePrice: toMoneyInput(item.purchasePrice, language),
    salePrice: toMoneyInput(item.salePrice, language),
  };
}

function originalExpiry(item: StockItem): string {
  return item.expiresAt ? item.expiresAt.slice(0, 10) : '';
}

function validateEditPrice(
  prefix: StockPricePrefix,
  raw: string,
  current: number | undefined,
): ValidationCode | null {
  return validateStockPrice(prefix, raw, current !== undefined);
}

function changedPrice(raw: string, current: number | undefined) {
  if (!raw.trim()) return undefined;
  const kurus = parseMoney(raw);
  return kurus === null || kurus === current ? undefined : kurus;
}

export function hasPrices(
  item: StockItem,
): item is StockItem & { purchasePrice: number; salePrice: number } {
  return (
    typeof item.purchasePrice === 'number' && typeof item.salePrice === 'number'
  );
}

export function validateStockEdit(
  values: StockEditValues,
  item: StockItem,
  today: string,
): Partial<Record<StockEditField, string>> {
  const errors: Partial<Record<StockEditField, string>> = {};
  const set = (field: StockEditField, code: string | null) => {
    if (code) errors[field] = code;
  };
  set('name', validateStockName(values.name));
  set('quantity', validateStockAmount('QUANTITY', values.quantity));
  set(
    'criticalLevel',
    validateStockAmount('CRITICAL_LEVEL', values.criticalLevel),
  );
  if (values.expiresAt !== originalExpiry(item)) {
    set('expiresAt', validateStockExpiry(values.expiresAt, today));
  }
  set(
    'purchasePrice',
    validateEditPrice(
      'PURCHASE_PRICE',
      values.purchasePrice,
      item.purchasePrice,
    ),
  );
  set(
    'salePrice',
    validateEditPrice('SALE_PRICE', values.salePrice, item.salePrice),
  );
  return errors;
}

export function toUpdateStockRequest(
  values: StockEditValues,
  item: StockItem,
): UpdateStockItemRequest {
  const request: UpdateStockItemRequest = {};
  const name = normalizeWhitespace(values.name);
  if (name !== item.name) request.name = name;
  const quantity = Number(values.quantity.trim());
  if (quantity !== item.quantity) request.quantity = quantity;
  const criticalLevel = Number(values.criticalLevel.trim());
  if (criticalLevel !== item.criticalLevel) {
    request.criticalLevel = criticalLevel;
  }
  if (values.expiresAt !== originalExpiry(item)) {
    request.expiresAt = values.expiresAt || null;
  }
  const purchasePrice = changedPrice(values.purchasePrice, item.purchasePrice);
  if (purchasePrice !== undefined) request.purchasePrice = purchasePrice;
  const salePrice = changedPrice(values.salePrice, item.salePrice);
  if (salePrice !== undefined) request.salePrice = salePrice;
  return request;
}

export type AdjustDirection = 'add' | 'remove';

export function validateStockAdjust(
  direction: AdjustDirection,
  raw: string,
  item: StockItem,
): ValidationCode | null {
  const value = raw.trim();
  if (!value) return 'DELTA_NOT_EMPTY';
  if (!/^\d+$/.test(value)) return 'DELTA_MUST_BE_NUMBER';
  const amount = Number(value);
  if (amount === 0) return 'DELTA_NOT_VALID';
  if (direction === 'remove' && amount > item.quantity) return 'QUANTITY_MIN|0';
  if (direction === 'add' && item.quantity + amount > STOCK_AMOUNT_MAX) {
    return `QUANTITY_MAX|${STOCK_AMOUNT_MAX}`;
  }
  return null;
}

export function toStockDelta(direction: AdjustDirection, raw: string): number {
  const amount = Number(raw.trim());
  return direction === 'remove' ? -amount : amount;
}

export function canStep(item: StockItem, delta: number): boolean {
  const next = item.quantity + delta;
  return next >= 0 && next <= STOCK_AMOUNT_MAX;
}

export type ExpiryState = 'expired' | 'soon' | null;

export function expiryState(item: StockItem, today: string): ExpiryState {
  if (!item.expiresAt) return null;
  const date = item.expiresAt.slice(0, 10);
  if (date < today) return 'expired';
  if (date <= addDays(today, 30)) return 'soon';
  return null;
}

export interface StockFilters {
  category: StockCategory | '';
  onlyBelowCritical: boolean;
  page: number;
}

export function readStockFilters(params: URLSearchParams): StockFilters {
  const category = params.get('category') ?? '';
  return {
    category: (STOCK_CATEGORIES as readonly string[]).includes(category)
      ? (category as StockCategory)
      : '',
    onlyBelowCritical: params.get('critical') === '1',
    page: parsePage(params.get('page')),
  };
}

export function writeStockFilters(filters: StockFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.onlyBelowCritical) params.set('critical', '1');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}
