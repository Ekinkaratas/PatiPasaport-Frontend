import { useSyncExternalStore } from 'react';

export interface FlashMessage {
  id: number;
  tone: 'success' | 'info';
  key: string;
  values?: Record<string, string | number>;
}

let current: FlashMessage | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function showFlash(
  key: string,
  options: {
    tone?: FlashMessage['tone'];
    values?: FlashMessage['values'];
  } = {},
): void {
  current = {
    id: nextId++,
    key,
    tone: options.tone ?? 'success',
    values: options.values,
  };
  emit();
}

export function dismissFlash(id?: number): void {
  if (!current || (id !== undefined && current.id !== id)) return;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return current;
}

export function useFlash(): FlashMessage | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
