import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { getClinic } from '@/api/endpoints/clinics';
import { getConsentStatus, listMyConsents } from '@/api/endpoints/consents';
import { isApiError } from '@/api/errors';
import type { Clinic } from '@/api/types';
import { clinicQueryKey } from '@/auth/hooks';

export const consentsQueryKey = ['consents'] as const;
export const CONSENTS_PAGE_SIZE = 8;

export function useConsents(page: number) {
  return useQuery({
    queryKey: [...consentsQueryKey, 'list', page],
    queryFn: ({ signal }) => listMyConsents(page, CONSENTS_PAGE_SIZE, signal),
    placeholderData: keepPreviousData,
  });
}

export function useConsentStatus(clinicId: string, petId: string) {
  return useQuery({
    queryKey: [...consentsQueryKey, 'status', clinicId, petId],
    queryFn: ({ signal }) => getConsentStatus(clinicId, petId, signal),
    enabled: Boolean(clinicId && petId),
    staleTime: 0,
  });
}

export function useClinic(clinicId: string | null) {
  return useQuery({
    queryKey: clinicQueryKey(clinicId ?? ''),
    queryFn: ({ signal }) =>
      getClinic(clinicId as string, signal).then((res) => res.clinic),
    enabled: Boolean(clinicId),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export type ClinicLookup = Clinic | 'missing' | undefined;

export function useClinicDirectory(
  clinicIds: string[],
): Record<string, ClinicLookup> {
  const unique = [...new Set(clinicIds)];
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: clinicQueryKey(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getClinic(id, signal).then((res) => res.clinic),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  return Object.fromEntries(
    unique.map((id, index) => {
      const result = results[index];
      if (result?.isSuccess) return [id, result.data];
      if (result?.isError && isApiError(result.error)) return [id, 'missing'];
      return [id, undefined];
    }),
  );
}
