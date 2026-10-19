import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { __resetSessionForTests, getSessionState } from '@/auth/session';
import { renderRoute } from '@/test/renderWithProviders';
import { RegisterPage } from './RegisterPage';

/** IntersectionObserver taklidi: metnin sonuna "kaydırmayı" test tetikler. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
  reachEnd() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Ad soyad'), 'Ayşe Yılmaz');
  await user.type(screen.getByLabelText('E-posta adresi'), 'ayse@example.com');
  await user.type(screen.getByLabelText('Cep telefonu'), '0555 123 45 67');
  await user.type(screen.getByLabelText('Şifre'), 'Guclu.Sifre1');
  await user.type(screen.getByLabelText('Şifre (tekrar)'), 'Guclu.Sifre1');
}

function passTime(ms = 5000) {
  const realNow = Date.now();
  vi.spyOn(Date, 'now').mockReturnValue(realNow + ms);
}

function kvkkCheckbox() {
  return screen.getByRole('checkbox', {
    name: /Kullanım Koşulları ve Aydınlatma Metni/,
  });
}

beforeEach(async () => {
  __resetSessionForTests();
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  await i18n.changeLanguage('tr');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RegisterPage — KVKK onayı', () => {
  it('metin açılmadan onay kutusu işaretlenemez, tıklamak metni açar', async () => {
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: '/register' });

    await user.click(kvkkCheckbox());

    expect(kvkkCheckbox()).not.toBeChecked();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('metnin sonuna kadar okunmadan "Okudum" düğmesi pasif kalır', async () => {
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: '/register' });

    await user.click(
      screen.getByRole('button', {
        name: 'Kullanım Koşulları ve Aydınlatma Metni',
      }),
    );
    const acknowledge = screen.getByRole('button', { name: 'Okudum, anladım' });
    expect(acknowledge).toBeDisabled();

    act(() => FakeIntersectionObserver.instances.at(-1)!.reachEnd());
    expect(acknowledge).toBeEnabled();

    await user.click(acknowledge);
    expect(kvkkCheckbox()).toBeChecked();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Okunduktan sonra kutu serbestçe işaretlenip kaldırılabilir.
    await user.click(kvkkCheckbox());
    expect(kvkkCheckbox()).not.toBeChecked();
  });

  it('onay olmadan form gönderilmez', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: '/register' });

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Hesabımı oluştur' }));

    expect(
      await screen.findByText(
        "Devam etmek için Kullanım Koşulları ve Aydınlatma Metni'ni okuyup onaylamalısınız.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('RegisterPage — gönderim', () => {
  async function acceptKvkk(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      screen.getByRole('button', {
        name: 'Kullanım Koşulları ve Aydınlatma Metni',
      }),
    );
    act(() => FakeIntersectionObserver.instances.at(-1)!.reachEnd());
    await user.click(screen.getByRole('button', { name: 'Okudum, anladım' }));
  }

  it('normalize edilmiş verileri gönderir ve oturumu başlatır', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(201, {
        data: {
          accessToken: 'AT',
          refreshExpiresIn: 43200,
          tokenType: 'Bearer',
          expiresIn: 900,
          userId: 'u1',
        },
        message: 'CREATED',
        success: true,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { router } = renderRoute(<RegisterPage />, {
      path: '/register',
      extraRoutes: [{ path: '/panel', element: <p>panel</p> }],
    });

    await user.type(screen.getByLabelText('Ad soyad'), '  Ayşe   Yılmaz ');
    await user.type(
      screen.getByLabelText('E-posta adresi'),
      ' Ayse@Example.com',
    );
    await user.type(screen.getByLabelText('Cep telefonu'), '0555 123 45 67');
    await user.type(screen.getByLabelText('Şifre'), 'Guclu.Sifre1');
    await user.type(screen.getByLabelText('Şifre (tekrar)'), 'Guclu.Sifre1');
    await acceptKvkk(user);
    passTime();
    await user.click(screen.getByRole('button', { name: 'Hesabımı oluştur' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/register');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      fullName: 'Ayşe Yılmaz',
      email: 'ayse@example.com',
      phone: '+905551234567',
      password: 'Guclu.Sifre1',
    });
    expect(getSessionState().status).toBe('authenticated');
  });

  it('"e-posta zaten kayıtlı" hatasını e-posta alanının altında gösterir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(409, {
          data: null,
          message: 'EMAIL_ALREADY_EXISTS',
          success: false,
          correlationId: 'c1',
        }),
      ),
    );
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: '/register' });

    await fillValidForm(user);
    await acceptKvkk(user);
    passTime();
    await user.click(screen.getByRole('button', { name: 'Hesabımı oluştur' }));

    const email = screen.getByLabelText('E-posta adresi');
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription(
      'Bu e-posta adresiyle kayıtlı bir hesap zaten var.',
    );
  });

  it('şifreler eşleşmezse uyarır', async () => {
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: '/register' });

    await user.type(screen.getByLabelText('Şifre'), 'Guclu.Sifre1');
    await user.type(screen.getByLabelText('Şifre (tekrar)'), 'Guclu.Sifre2');
    passTime();
    await user.click(screen.getByRole('button', { name: 'Hesabımı oluştur' }));

    expect(
      await screen.findByText('Şifreler birbiriyle eşleşmiyor.'),
    ).toBeInTheDocument();
  });
});

describe('RegisterPage — bot koruması', () => {
  async function acceptKvkk(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      screen.getByRole('button', {
        name: 'Kullanım Koşulları ve Aydınlatma Metni',
      }),
    );
    act(() => FakeIntersectionObserver.instances.at(-1)!.reachEnd());
    await user.click(screen.getByRole('button', { name: 'Okudum, anladım' }));
  }

  const blockedText =
    'İsteğiniz güvenlik nedeniyle işlenemedi. Lütfen sayfayı yenileyip tekrar deneyin.';

  it('gizli alan doldurulmuşsa istek gönderilmez', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: '/register' });

    await fillValidForm(user);
    await acceptKvkk(user);
    const trap = document.querySelector<HTMLInputElement>(
      'input[name="pp_contact_reference"]',
    )!;
    await user.type(trap, 'spam');
    passTime();
    await user.click(screen.getByRole('button', { name: 'Hesabımı oluştur' }));

    expect(await screen.findByText(blockedText)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('form insanüstü bir hızla gönderilirse istek gönderilmez', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: '/register' });

    await fillValidForm(user);
    await acceptKvkk(user);
    await user.click(screen.getByRole('button', { name: 'Hesabımı oluştur' }));

    expect(await screen.findByText(blockedText)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gizli alan ekran okuyuculardan ve klavye sırasından gizlidir', () => {
    renderRoute(<RegisterPage />, { path: '/register' });
    const trap = document.querySelector<HTMLInputElement>(
      'input[name="pp_contact_reference"]',
    )!;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(trap).toHaveAttribute('autocomplete', 'off');
  });
});
