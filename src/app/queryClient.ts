import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';

/**
 * 4xx hataları tekrar denenmez (istek değişmedikçe sonuç değişmez);
 * ağ hataları ve 5xx en fazla 2 kez yeniden denenir.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
