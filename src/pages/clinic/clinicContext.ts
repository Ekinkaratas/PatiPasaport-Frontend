import { useOutletContext } from 'react-router';
import type { Clinic } from '@/api/types';

export interface ClinicContext {
  clinic: Clinic;
}

export function useClinicAccount(): Clinic {
  return useOutletContext<ClinicContext>().clinic;
}
