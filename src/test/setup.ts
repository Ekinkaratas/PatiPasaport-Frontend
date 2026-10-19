import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n from '@/i18n';

const missingKeys = new Set<string>();
i18n.options.saveMissing = true;
i18n.options.missingKeyHandler = (_languages, namespace, key) => {
  missingKeys.add(`${namespace}:${key}`);
};

afterAll(() => {
  expect([...missingKeys], 'çeviri dosyalarında olmayan anahtarlar').toEqual(
    [],
  );
});

// jsdom <dialog> modal API'sini desteklemiyor; testler için asgari karşılık.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(
    this: HTMLDialogElement,
  ) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
