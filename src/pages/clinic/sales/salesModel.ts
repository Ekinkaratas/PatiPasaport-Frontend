import type { CreateStockSaleRequest, StockItem, StockSale } from '@/api/types';
import {
  STOCK_AMOUNT_MAX,
  validateStockPrice,
  type ValidationCode,
} from '@/domain/validation';
import { monthInBusinessTimeZone } from '@/lib/format';
import { parseMoney, toMoneyInput } from '@/lib/money';
import { parsePage } from '@/lib/pagination';

export interface SaleFormValues {
  quantity: string;
  unitPrice: string;
}

export type SaleFormField = keyof SaleFormValues;

export function saleFormFrom(
  item: StockItem,
  language: string,
  quantity = '1',
): SaleFormValues {
  return {
    quantity: quantity.trim() || '1',
    unitPrice: toMoneyInput(item.salePrice, language),
  };
}

function validateSaleQuantity(
  raw: string,
  item: StockItem,
): ValidationCode | null {
  const value = raw.trim();
  if (!value) return 'QUANTITY_NOT_EMPTY';
  if (!/^\d+$/.test(value)) return 'QUANTITY_MUST_BE_NUMBER';
  const quantity = Number(value);
  if (quantity < 1) return 'QUANTITY_MIN|1';
  if (quantity > STOCK_AMOUNT_MAX) return `QUANTITY_MAX|${STOCK_AMOUNT_MAX}`;
  if (quantity > item.quantity) return 'QUANTITY_MIN|0';
  return null;
}

export function validateSaleForm(
  values: SaleFormValues,
  item: StockItem,
): Partial<Record<SaleFormField, string>> {
  const errors: Partial<Record<SaleFormField, string>> = {};
  const quantity = validateSaleQuantity(values.quantity, item);
  if (quantity) errors.quantity = quantity;
  const unitPrice = validateStockPrice('UNIT_PRICE', values.unitPrice, false);
  if (unitPrice) errors.unitPrice = unitPrice;
  return errors;
}

export function toSaleRequest(values: SaleFormValues): CreateStockSaleRequest {
  const quantity = Number(values.quantity.trim());
  const unitPrice = parseMoney(values.unitPrice);
  return unitPrice === null ? { quantity } : { quantity, unitPrice };
}

export interface SalePreview {
  total: number;
  cost: number;
  profit: number;
}

export function salePreview(
  values: SaleFormValues,
  item: StockItem,
): SalePreview | null {
  if (item.purchasePrice === undefined || item.salePrice === undefined) {
    return null;
  }
  if (Object.keys(validateSaleForm(values, item)).length > 0) return null;
  const quantity = Number(values.quantity.trim());
  const unitPrice = parseMoney(values.unitPrice) ?? item.salePrice;
  const total = quantity * unitPrice;
  const cost = quantity * item.purchasePrice;
  return { total, cost, profit: total - cost };
}

export function isCancelled(sale: StockSale): boolean {
  return sale.cancelledAt !== '';
}

export function canCancelSale(sale: StockSale, now: Date = new Date()) {
  return (
    !isCancelled(sale) &&
    monthInBusinessTimeZone(new Date(sale.soldAt)) ===
      monthInBusinessTimeZone(now)
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function validDate(value: string | null): string {
  return value && DATE_ONLY.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : '';
}

export interface SalesFilters {
  fromDate: string;
  toDate: string;
  page: number;
}

export function readSalesFilters(params: URLSearchParams): SalesFilters {
  return {
    fromDate: validDate(params.get('from')),
    toDate: validDate(params.get('to')),
    page: parsePage(params.get('page')),
  };
}

export function writeSalesFilters(filters: SalesFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set('from', filters.fromDate);
  if (filters.toDate) params.set('to', filters.toDate);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function validateSalesRange(
  fromDate: string,
  toDate: string,
): ValidationCode | null {
  return fromDate && toDate && toDate < fromDate ? 'TO_DATE_NOT_VALID' : null;
}

export function readMonth(value: string | null, current: string): string {
  return value && MONTH.test(value) && value <= current ? value : current;
}

export function shiftMonth(month: string, delta: number): string {
  const [year = 0, monthIndex = 1] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
