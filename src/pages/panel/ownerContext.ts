import { useOutletContext } from 'react-router';
import type { GetMeResponse } from '@/api/types';

export interface OwnerContext {
  profile: GetMeResponse;
}

export function useOwnerProfile(): GetMeResponse {
  return useOutletContext<OwnerContext>().profile;
}
