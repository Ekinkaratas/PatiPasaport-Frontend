import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { renderRoute } from '@/test/renderWithProviders';
import { Header } from './Header';

beforeEach(async () => {
  await i18n.changeLanguage('tr');
});

function mobileMenu() {
  return document.getElementById('mobile-menu')!;
}

describe('Header mobil menü', () => {
  it('tema seçilince menü açık kalır, bağlantıya basılınca kapanır', async () => {
    const user = userEvent.setup();
    renderRoute(<Header />);

    await user.click(screen.getByRole('button', { name: 'Menüyü aç' }));
    expect(mobileMenu()).toBeVisible();

    await user.click(
      within(mobileMenu()).getByRole('button', { name: 'Açık' }),
    );
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(mobileMenu()).toBeVisible();

    await user.click(
      within(mobileMenu()).getByRole('link', { name: 'Nasıl çalışır?' }),
    );
    expect(mobileMenu()).not.toBeVisible();
  });
});
