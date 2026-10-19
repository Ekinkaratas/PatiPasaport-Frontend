import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import '@/i18n';

/** Sayfayı React Query ve bellek içi router ile çizer. */
export function renderRoute(
  element: ReactElement,
  options: {
    path?: string;
    initialEntry?: string;
    extraRoutes?: Array<{ path: string; element: ReactElement }>;
  } = {},
) {
  const path = options.path ?? '/';
  const initialEntry = options.initialEntry ?? path;
  const extraRoutes = options.extraRoutes ?? [];
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path, element }, ...extraRoutes], {
    initialEntries: [initialEntry],
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}
