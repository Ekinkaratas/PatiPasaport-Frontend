import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import {
  __resetSessionForTests,
  getSessionState,
  startSession,
} from '@/auth/session';
import { renderRoute } from '@/test/renderWithProviders';
import { DeactivateClinicModal } from './DeactivateClinicModal';

const CLINIC_ID = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';

function ok(data: unknown) {
  return new Response(
    JSON.stringify({ data, message: 'SUCCESS', success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

beforeEach(async () => {
  __resetSessionForTests();
  startSession({
    accessToken: 'AT',
    refreshExpiresIn: 43200,
    tokenType: 'Bearer',
    expiresIn: 900,
    userId: 'clinic-user',
    clinicId: CLINIC_ID,
  });
  await i18n.changeLanguage('tr');
});

afterEach(() => vi.unstubAllGlobals());

describe('DeactivateClinicModal', () => {
  it('onay verilmeden istek gönderilmez; onaydan sonra klinik pasifleşir ve oturum kapanır', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        String(input).endsWith('/deactivate')
          ? ok({ clinic: { id: CLINIC_ID, isActive: false } })
          : ok({ success: true }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderRoute(
      <DeactivateClinicModal clinicId={CLINIC_ID} open onClose={() => {}} />,
    );

    const submit = screen.getByRole('button', { name: 'Kliniği pasifleştir' });
    expect(submit).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', {
        name: /Kliniğin pasifleştirileceğini/,
      }),
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() =>
      expect(getSessionState()).toMatchObject({ status: 'anonymous' }),
    );
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toContain(`/api/clinics/${CLINIC_ID}/deactivate`);
    expect(urls).toContain('/api/auth/logout');
  });
});
