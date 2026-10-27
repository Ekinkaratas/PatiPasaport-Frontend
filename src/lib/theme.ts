import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pp.theme';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark'];
export const DEFAULT_THEME: ThemePreference = 'dark';

const THEME_COLOR_VARIABLE = '--pp-bg';

function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function writeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    return;
  }
}

export function applyTheme(theme: ThemePreference): void {
  try {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const color = getComputedStyle(root)
      .getPropertyValue(THEME_COLOR_VARIABLE)
      .trim();
    if (meta && color) meta.content = color;
  } catch {
    return;
  }
}

let current: ThemePreference | null = null;
let syncing = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
  current = readThemePreference();
  applyTheme(current);
  notify();
}

export function startThemeSync(): void {
  if (syncing || typeof window === 'undefined') return;
  syncing = true;
  window.addEventListener('storage', handleStorage);
}

export function getThemePreference(): ThemePreference {
  if (current === null) current = readThemePreference();
  return current;
}

export function setThemePreference(preference: ThemePreference): void {
  current = preference;
  writeThemePreference(preference);
  applyTheme(preference);
  notify();
}

function subscribe(listener: () => void): () => void {
  startThemeSync();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): ThemePreference {
  return DEFAULT_THEME;
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, getServerSnapshot);
}
