import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { setThemePreference, THEME_STORAGE_KEY } from '@/lib/theme';
import { ThemeSwitcher } from './ThemeSwitcher';

beforeEach(async () => {
  await i18n.changeLanguage('tr');
});

afterEach(() => {
  act(() => setThemePreference('dark'));
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});

describe('ThemeSwitcher', () => {
  it('yalnızca Açık ve Koyu seçeneklerini gösterir, varsayılanda Koyu seçilidir', () => {
    render(<ThemeSwitcher />);

    const group = screen.getByRole('group', { name: 'Tema' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Açık' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Koyu' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: 'Sistem' }),
    ).not.toBeInTheDocument();
  });

  it('Açık seçilince açık temayı uygular ve tercihi saklar', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Açık' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(screen.getByRole('button', { name: 'Açık' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Koyu' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('Koyu seçilince koyu temaya geri döner', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Açık' }));
    await user.click(screen.getByRole('button', { name: 'Koyu' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Koyu' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Açık' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('başka sekmede değişen tercihi gösterir', () => {
    render(<ThemeSwitcher />);

    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'light',
        }),
      );
    });

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('button', { name: 'Açık' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('İngilizce etiketleri gösterir', async () => {
    await i18n.changeLanguage('en');
    render(<ThemeSwitcher />);

    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'title',
      'Light',
    );
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'title',
      'Dark',
    );
    expect(
      screen.queryByRole('button', { name: 'System' }),
    ).not.toBeInTheDocument();
  });
});
