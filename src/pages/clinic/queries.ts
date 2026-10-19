import {
  keepPreviousData,
  useQueries,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';
import {
  getClinicPetOverview,
  getStockSalesSummary,
  listStockItems,
  listStockSales,
  type ListStockItemsQuery,
  type ListStockSalesQuery,
} from '@/api/endpoints/clinics';
import { listMyConsents } from '@/api/endpoints/consents';
import {
  getPet,
  searchClinicPets,
  type SearchClinicPetsQuery,
} from '@/api/endpoints/pets';
import { isApiError } from '@/api/errors';
import type {
  Consent,
  ListStockItemsResponse,
  Pet,
  StockItem,
} from '@/api/types';
import { isUuidV4 } from '@/lib/ids';

export const clinicKeys = {
  all: ['clinic'] as const,
  consents: (page: number) => ['clinic', 'consents', page] as const,
  consentFor: (petId: string) => ['clinic', 'consent-for', petId] as const,
  search: (query: SearchClinicPetsQuery) =>
    ['clinic', 'search', query] as const,
  overview: (clinicId: string, petId: string) =>
    ['clinic', 'overview', clinicId, petId] as const,
  pet: (petId: string) => ['clinic', 'pet', petId] as const,
  stockAll: ['clinic', 'stock'] as const,
  stock: (clinicId: string, query: ListStockItemsQuery) =>
    ['clinic', 'stock', clinicId, query] as const,
  salesAll: ['clinic', 'sales'] as const,
  sales: (clinicId: string, query: ListStockSalesQuery) =>
    ['clinic', 'sales', 'list', clinicId, query] as const,
  salesSummary: (clinicId: string, month: string) =>
    ['clinic', 'sales', 'summary', clinicId, month] as const,
};

export const CLINIC_CONSENTS_PAGE_SIZE = 8;
export const PATIENTS_PAGE_SIZE = 16;
export const STOCK_PAGE_SIZE = 16;
export const SALES_PAGE_SIZE = 16;

export function useClinicConsents(page: number) {
  return useQuery({
    queryKey: clinicKeys.consents(page),
    queryFn: ({ signal }) =>
      listMyConsents(page, CLINIC_CONSENTS_PAGE_SIZE, signal),
    placeholderData: keepPreviousData,
  });
}

export function useClinicConsentFor(petId: string) {
  return useQuery({
    queryKey: clinicKeys.consentFor(petId),
    enabled: isUuidV4(petId),
    queryFn: async ({ signal }): Promise<Consent | null> => {
      const pageSize = 128;
      for (let page = 1; page <= 20; page += 1) {
        const res = await listMyConsents(page, pageSize, signal);
        const found = res.consents.find((consent) => consent.petId === petId);
        if (found) return found;
        if (page * pageSize >= res.total) return null;
      }
      return null;
    },
  });
}

export function usePatientSearch(query: SearchClinicPetsQuery) {
  return useQuery({
    queryKey: clinicKeys.search(query),
    queryFn: ({ signal }) => searchClinicPets(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function usePatientOverview(clinicId: string, petId: string) {
  return useQuery({
    queryKey: clinicKeys.overview(clinicId, petId),
    queryFn: ({ signal }) => getClinicPetOverview(clinicId, petId, signal),
    enabled: isUuidV4(petId),
  });
}

export function usePatient(petId: string) {
  return useQuery({
    queryKey: clinicKeys.pet(petId),
    queryFn: ({ signal }) => getPet(petId, signal).then((res) => res.pet),
    enabled: isUuidV4(petId),
  });
}

export function usePatientsByIds(
  petIds: string[],
): Record<string, Pet | null | undefined> {
  const unique = [...new Set(petIds)];
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: clinicKeys.pet(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getPet(id, signal).then((res) => res.pet),
      retry: false,
    })),
  });
  return Object.fromEntries(
    unique.map((id, index) => {
      const result = results[index];
      if (result?.isSuccess) return [id, result.data];
      if (result?.isError && isApiError(result.error)) return [id, null];
      return [id, undefined];
    }),
  );
}

export function useStock(clinicId: string, query: ListStockItemsQuery) {
  return useQuery({
    queryKey: clinicKeys.stock(clinicId, query),
    queryFn: ({ signal }) => listStockItems(clinicId, query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useStockSales(clinicId: string, query: ListStockSalesQuery) {
  return useQuery({
    queryKey: clinicKeys.sales(clinicId, query),
    queryFn: ({ signal }) => listStockSales(clinicId, query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSalesSummary(clinicId: string, month: string) {
  return useQuery({
    queryKey: clinicKeys.salesSummary(clinicId, month),
    queryFn: ({ signal }) => getStockSalesSummary(clinicId, month, signal),
    placeholderData: keepPreviousData,
  });
}

export async function applyStockItemChange(
  queryClient: QueryClient,
  item: StockItem,
  change: 'updated' | 'deleted',
): Promise<void> {
  queryClient.setQueriesData<ListStockItemsResponse>(
    { queryKey: clinicKeys.stockAll },
    (data) => {
      if (!data) return data;
      if (change === 'deleted') {
        const items = data.items.filter((entry) => entry.id !== item.id);
        return items.length === data.items.length
          ? data
          : { ...data, items, total: Math.max(0, data.total - 1) };
      }
      return {
        ...data,
        items: data.items.map((entry) => (entry.id === item.id ? item : entry)),
      };
    },
  );
  await queryClient.invalidateQueries({ queryKey: clinicKeys.stockAll });
}

export function isPatientNotFound(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.status === 404 ||
      error.status === 403 ||
      (error.status === 400 && error.field === 'PET_ID'))
  );
}
