import { api } from '../client';
import type {
  AddStockItemRequest,
  ClinicPetOverview,
  ClinicResponse,
  CreateStockSaleRequest,
  ListStockItemsResponse,
  ListStockSalesResponse,
  StockItemResponse,
  StockSaleResponse,
  StockSalesSummary,
  UpdateStockItemRequest,
  UploadPetResultResponse,
} from '../types';

function clinicPath(clinicId: string, rest = ''): string {
  return `/clinics/${encodeURIComponent(clinicId)}${rest}`;
}

function stockItemPath(clinicId: string, itemId: string, rest = ''): string {
  return clinicPath(
    clinicId,
    `/stock-items/${encodeURIComponent(itemId)}${rest}`,
  );
}

export function getClinic(
  id: string,
  signal?: AbortSignal,
): Promise<ClinicResponse> {
  return api.get<ClinicResponse>(clinicPath(id), { signal });
}

export function deactivateClinic(clinicId: string): Promise<ClinicResponse> {
  return api.post<ClinicResponse>(clinicPath(clinicId, '/deactivate'));
}

export interface ListStockItemsQuery {
  page: number;
  pageSize: number;
  category?: string;
  onlyBelowCritical?: boolean;
}

export function listStockItems(
  clinicId: string,
  { page, pageSize, category, onlyBelowCritical }: ListStockItemsQuery,
  signal?: AbortSignal,
): Promise<ListStockItemsResponse> {
  return api.get<ListStockItemsResponse>(clinicPath(clinicId, '/stock-items'), {
    query: {
      page,
      pageSize,
      category,
      onlyBelowCritical: onlyBelowCritical ? 'true' : undefined,
    },
    signal,
  });
}

export function addStockItem(
  clinicId: string,
  request: AddStockItemRequest,
): Promise<StockItemResponse> {
  return api.post<StockItemResponse>(
    clinicPath(clinicId, '/stock-items'),
    request,
  );
}

export function updateStockItem(
  clinicId: string,
  itemId: string,
  request: UpdateStockItemRequest,
): Promise<StockItemResponse> {
  return api.patch<StockItemResponse>(stockItemPath(clinicId, itemId), request);
}

export function adjustStockItem(
  clinicId: string,
  itemId: string,
  delta: number,
): Promise<StockItemResponse> {
  return api.post<StockItemResponse>(
    stockItemPath(clinicId, itemId, '/adjust'),
    { delta },
  );
}

export function deleteStockItem(
  clinicId: string,
  itemId: string,
): Promise<StockItemResponse> {
  return api.delete<StockItemResponse>(stockItemPath(clinicId, itemId));
}

export function createStockSale(
  clinicId: string,
  itemId: string,
  request: CreateStockSaleRequest,
): Promise<StockSaleResponse> {
  return api.post<StockSaleResponse>(
    stockItemPath(clinicId, itemId, '/sales'),
    request,
  );
}

export interface ListStockSalesQuery {
  page: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
}

export function listStockSales(
  clinicId: string,
  { page, pageSize, fromDate, toDate }: ListStockSalesQuery,
  signal?: AbortSignal,
): Promise<ListStockSalesResponse> {
  return api.get<ListStockSalesResponse>(clinicPath(clinicId, '/stock-sales'), {
    query: { page, pageSize, fromDate, toDate },
    signal,
  });
}

export function cancelStockSale(
  clinicId: string,
  saleId: string,
): Promise<StockSaleResponse> {
  return api.post<StockSaleResponse>(
    clinicPath(clinicId, `/stock-sales/${encodeURIComponent(saleId)}/cancel`),
  );
}

export function getStockSalesSummary(
  clinicId: string,
  month: string,
  signal?: AbortSignal,
): Promise<StockSalesSummary> {
  return api.get<StockSalesSummary>(
    clinicPath(clinicId, '/stock-sales/summary'),
    { query: { month }, signal },
  );
}

export function getClinicPetOverview(
  clinicId: string,
  petId: string,
  signal?: AbortSignal,
): Promise<ClinicPetOverview> {
  return api.get<ClinicPetOverview>(
    clinicPath(clinicId, `/pets/${encodeURIComponent(petId)}/overview`),
    { signal },
  );
}

export const UPLOAD_TIMEOUT_MS = 60_000;

export function uploadPetResult(
  clinicId: string,
  petId: string,
  file: File,
  note: string,
): Promise<UploadPetResultResponse> {
  const form = new FormData();
  form.append('file', file);
  if (note) form.append('note', note);
  return api.post<UploadPetResultResponse>(
    clinicPath(clinicId, `/pets/${encodeURIComponent(petId)}/documents`),
    form,
    { timeoutMs: UPLOAD_TIMEOUT_MS },
  );
}
