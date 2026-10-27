import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ThemeModule = typeof import('./theme');

async function loadTheme(): Promise<ThemeModule> {
  vi.resetModules();
  return import('./theme');
}

let style: HTMLStyleElement;
let meta: HTMLMetaElement;

beforeEach(() => {
  style = document.createElement('style');
  style.textContent =
    "[data-theme='light'] { --pp-bg: zemin-acik; } [data-theme='dark'] { --pp-bg: zemin-koyu; }";
  document.head.append(style);
  meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = 'baslangic';
  document.head.append(meta);
});

afterEach(() => {
  style.remove();
  meta.remove();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
  vi.restoreAllMocks();
});

describe('tema tercihi', () => {
  it('kayıt yoksa varsayılan koyudur', async () => {
    const theme = await loadTheme();
    expect(theme.readThemePreference()).toBe('dark');
    expect(theme.getThemePreference()).toBe('dark');
  });

  it('yalnızca açık ve koyu seçenekleri vardır', async () => {
    const theme = await loadTheme();
    expect(theme.THEME_PREFERENCES).toEqual(['light', 'dark']);
  });

  it('kaydedilen tercih okunur', async () => {
    localStorage.setItem('pp.theme', 'light');
    const theme = await loadTheme();
    expect(theme.getThemePreference()).toBe('light');
    localStorage.setItem('pp.theme', 'dark');
    expect(theme.readThemePreference()).toBe('dark');
  });

  it('eski sürümden kalan sistem değeri koyu sayılır', async () => {
    localStorage.setItem('pp.theme', 'system');
    const theme = await loadTheme();
    expect(theme.readThemePreference()).toBe('dark');
    expect(theme.getThemePreference()).toBe('dark');
  });

  it('geçersiz değer koyu sayılır', async () => {
    localStorage.setItem('pp.theme', 'mor');
    const theme = await loadTheme();
    expect(theme.readThemePreference()).toBe('dark');
  });
});

describe('temanın uygulanması', () => {
  it('data-theme, color-scheme ve theme-color değişir', async () => {
    const theme = await loadTheme();
    theme.applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(meta.content).toBe('zemin-koyu');
    theme.applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(meta.content).toBe('zemin-acik');
  });

  it('tercih kaydedilir ve hemen uygulanır', async () => {
    const theme = await loadTheme();
    theme.setThemePreference('light');
    expect(localStorage.getItem('pp.theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(theme.getThemePreference()).toBe('light');
    theme.setThemePreference('dark');
    expect(localStorage.getItem('pp.theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(theme.getThemePreference()).toBe('dark');
  });

  it('localStorage hata verirse çökmez ve koyu sayılır', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('engellendi');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('engellendi');
    });
    const theme = await loadTheme();
    expect(theme.readThemePreference()).toBe('dark');
    expect(() => theme.setThemePreference('light')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('useThemePreference', () => {
  it('tercih değişince güncellenir', async () => {
    const theme = await loadTheme();
    const { result } = renderHook(() => theme.useThemePreference());
    expect(result.current).toBe('dark');
    act(() => theme.setThemePreference('light'));
    expect(result.current).toBe('light');
    act(() => theme.setThemePreference('dark'));
    expect(result.current).toBe('dark');
  });

  it('başka sekmede değişen tercih uygulanır', async () => {
    const theme = await loadTheme();
    const { result } = renderHook(() => theme.useThemePreference());
    localStorage.setItem('pp.theme', 'light');
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'pp.theme', newValue: 'light' }),
      );
    });
    expect(result.current).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('başka sekmede tercih silinince koyuya döner', async () => {
    localStorage.setItem('pp.theme', 'light');
    const theme = await loadTheme();
    const { result } = renderHook(() => theme.useThemePreference());
    expect(result.current).toBe('light');
    localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(result.current).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
