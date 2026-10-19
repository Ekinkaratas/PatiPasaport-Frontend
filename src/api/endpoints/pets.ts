import { api } from '../client';
import type {
  CreatePetRequest,
  ListMyPetsResponse,
  PetResponse,
  SearchClinicPetsResponse,
  UpdatePetRequest,
} from '../types';

export function listMyPets(signal?: AbortSignal): Promise<ListMyPetsResponse> {
  return api.get<ListMyPetsResponse>('/pets', { signal });
}

export function getPet(id: string, signal?: AbortSignal): Promise<PetResponse> {
  return api.get<PetResponse>(`/pets/${encodeURIComponent(id)}`, { signal });
}

export function createPet(request: CreatePetRequest): Promise<PetResponse> {
  return api.post<PetResponse>('/pets', request);
}

export function updatePet(
  id: string,
  request: UpdatePetRequest,
): Promise<PetResponse> {
  return api.patch<PetResponse>(`/pets/${encodeURIComponent(id)}`, request);
}

export interface SearchClinicPetsQuery {
  name?: string;
  chipNumber?: string;
  species?: string;
  orderFilter?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export function searchClinicPets(
  query: SearchClinicPetsQuery,
  signal?: AbortSignal,
): Promise<SearchClinicPetsResponse> {
  return api.get<SearchClinicPetsResponse>('/pets/search', {
    query: { ...query },
    signal,
  });
}
