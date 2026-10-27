import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { DEMO_BANNER_KEY, DemoBanner } from './DemoBanner';

beforeEach(async () => {
  await i18n.changeLanguage('tr');
});

describe('DemoBanner', () => {
  it('projenin demo olduğunu söyler ve ayrıntıda kullanım koşullarını açar', async () => {
    const user = userEvent.setup();
    render(<DemoBanner />);

    const banner = screen.getByRole('complementary', {
      name: 'Proje bilgilendirmesi',
    });
    expect(banner).toHaveTextContent('eğitim amaçlı bir demo projesidir');

    await user.click(screen.getByRole('button', { name: 'Ayrıntılar' }));
    expect(
      screen.getByRole('dialog', {
        name: 'Kullanım Koşulları ve Aydınlatma Metni',
      }),
    ).toBeInTheDocument();
  });

  it('kapatılınca gizlenir ve bu tarayıcıda bir daha görünmez', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DemoBanner />);

    await user.click(
      screen.getByRole('button', { name: 'Bilgilendirmeyi kapat' }),
    );
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(localStorage.getItem(DEMO_BANNER_KEY)).toBe('1');

    unmount();
    render(<DemoBanner />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
