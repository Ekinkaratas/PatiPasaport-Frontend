import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPet, listMyPets } from '@/api/endpoints/pets';
import { isApiError } from '@/api/errors';
import type { ListMyPetsResponse, Pet } from '@/api/types';
import { isUuidV4 } from '@/lib/ids';

export const petsQueryKey = ['pets'] as const;
export const petQueryKey = (id: string) => ['pets', id] as const;

export function usePets() {
  return useQuery({
    queryKey: petsQueryKey,
    queryFn: ({ signal }) => listMyPets(signal),
    select: (data) => data.pets,
  });
}

export function usePet(id: string) {
  const queryClient = useQueryClient();
  return useQuery<Pet>({
    queryKey: petQueryKey(id),
    queryFn: ({ signal }) => getPet(id, signal).then((res) => res.pet),
    enabled: isUuidV4(id),
    placeholderData: () =>
      queryClient
        .getQueryData<ListMyPetsResponse>(petsQueryKey)
        ?.pets.find((pet) => pet.id === id),
  });
}

export function useStorePet() {
  const queryClient = useQueryClient();
  return (pet: Pet) => {
    queryClient.setQueryData(petQueryKey(pet.id), pet);
    queryClient.setQueryData<ListMyPetsResponse>(petsQueryKey, (old) => {
      if (!old) return old;
      const exists = old.pets.some((item) => item.id === pet.id);
      return {
        pets: exists
          ? old.pets.map((item) => (item.id === pet.id ? pet : item))
          : [pet, ...old.pets],
      };
    });
  };
}

export function isPetNotFound(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.status === 404 || (error.status === 400 && error.field === 'PET_ID'))
  );
}
