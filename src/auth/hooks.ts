import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClinic } from '@/api/endpoints/clinics';
import { getMe } from '@/api/endpoints/users';
import type { Clinic, GetMeResponse } from '@/api/types';
import { endSession } from './session';
import { useSession } from './useSession';

export const meQueryKey = (userId: string | null) =>
  ['users', 'me', userId] as const;

export type Account =
  | { kind: 'loading' }
  | { kind: 'owner'; profile: GetMeResponse }
  | { kind: 'clinic'; clinic: Clinic }
  | { kind: 'error'; error: unknown; retry: () => void };

export const clinicQueryKey = (clinicId: string) =>
  ['clinics', clinicId] as const;

export function useAccount(): Account {
  const session = useSession();
  const authenticated = session.status === 'authenticated';
  const clinicId = session.clinicId;

  const me = useQuery({
    queryKey: meQueryKey(session.userId),
    queryFn: ({ signal }) => getMe(signal),
    enabled: authenticated && !clinicId,
    staleTime: 5 * 60_000,
  });

  const clinic = useQuery({
    queryKey: clinicQueryKey(clinicId ?? ''),
    queryFn: ({ signal }) =>
      getClinic(clinicId as string, signal).then((res) => res.clinic),
    enabled: authenticated && Boolean(clinicId),
    staleTime: 5 * 60_000,
  });

  if (clinicId) {
    if (clinic.isSuccess) return { kind: 'clinic', clinic: clinic.data };
    if (clinic.isError) {
      return {
        kind: 'error',
        error: clinic.error,
        retry: () => void clinic.refetch(),
      };
    }
    return { kind: 'loading' };
  }
  if (me.isSuccess) return { kind: 'owner', profile: me.data };
  if (me.isError) {
    return { kind: 'error', error: me.error, retry: () => void me.refetch() };
  }
  return { kind: 'loading' };
}

export function useLogout() {
  const queryClient = useQueryClient();

  return async () => {
    await endSession();
    queryClient.clear();
  };
}

/**
 * Giriş sonrası dönülecek adres. Yalnızca site içi yollar kabul edilir
 * (`//evil.com` gibi açık yönlendirmelere izin verilmez).
 */
export function safeRedirectPath(
  next: string | null,
  fallback = '/panel',
): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  if (next.startsWith('/\\')) return fallback;
  return next;
}
