import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import type { Clinic } from '@/api/types';
import { FlashBanner } from '@/components/layout/FlashBanner';

export interface MockRequest {
  url: string;
  path: string;
  query: URLSearchParams;
  method: string;
  body: unknown;
}

export type MockHandler = (
  request: MockRequest,
) => Response | Promise<Response> | undefined;

export function apiOk(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({ data, message: 'SUCCESS', success: true }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

export function apiFail(status: number, message: string): Response {
  return new Response(JSON.stringify({ data: null, message, success: false }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function installApi(handler: MockHandler) {
  const requests: MockRequest[] = [];
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const parsed = new URL(url, 'http://test');
      const raw = init?.body;
      const request: MockRequest = {
        url,
        path: parsed.pathname,
        query: parsed.searchParams,
        method: init?.method ?? 'GET',
        body:
          typeof raw === 'string'
            ? JSON.parse(raw)
            : raw instanceof FormData
              ? raw
              : undefined,
      };
      requests.push(request);
      return (await handler(request)) ?? apiFail(404, 'NOT_FOUND');
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  return {
    fetchMock,
    requests,
    find: (method: string, path: string) =>
      requests.filter(
        (request) => request.method === method && request.path === path,
      ),
  };
}

export function renderInClinic(
  element: ReactElement,
  {
    clinic,
    path,
    initialEntry,
    extraRoutes = [],
  }: {
    clinic: Clinic;
    path: string;
    initialEntry?: string;
    extraRoutes?: Array<{ path: string; element: ReactElement }>;
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <FlashBanner />
            <Outlet context={{ clinic }} />
          </>
        ),
        children: [{ path, element }, ...extraRoutes],
      },
    ],
    { initialEntries: [initialEntry ?? path] },
  );
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}
