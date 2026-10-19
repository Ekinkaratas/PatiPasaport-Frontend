import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { GuestOnly, RequireAuth } from './guards';
import {
  __resetSessionForTests,
  endSession,
  initSession,
  startSession,
} from './session';

const tokens = {
  accessToken: 'AT',
  refreshExpiresIn: 43200,
  tokenType: 'Bearer',
  expiresIn: 900,
  userId: 'u1',
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>home</p> },
      {
        element: <GuestOnly />,
        children: [{ path: '/login', element: <p>login</p> }],
      },
      {
        element: <RequireAuth />,
        children: [{ path: '/panel/*', element: <p>panel</p> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  __resetSessionForTests();
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ data: null, message: 'UNAUTH', success: false }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('GuestOnly', () => {
  it('girişten sonra next adresine yönlendirir', async () => {
    await act(() => initSession());
    const router = renderAt('/login?next=%2Fpanel%2Fprofile');
    act(() => startSession(tokens));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/panel/profile'),
    );
  });

  it('dış adrese yönlendirmez', async () => {
    act(() => startSession(tokens));
    const router = renderAt('/login?next=%2F%2Fevil.com');
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));
  });
});

describe('RequireAuth', () => {
  it('oturum yoksa dönüş adresiyle giriş sayfasına yönlendirir', async () => {
    await act(() => initSession());
    const router = renderAt('/panel/pets');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe('?next=%2Fpanel%2Fpets');
  });

  it('çıkış yapılınca ana sayfaya yönlendirir', async () => {
    act(() => startSession(tokens));
    const router = renderAt('/panel/pets');
    await act(() => endSession());
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
