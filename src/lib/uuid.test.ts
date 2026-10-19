import { afterEach, describe, expect, it, vi } from 'vitest';
import { isUuidV4 } from './ids';
import { randomUuid } from './uuid';

afterEach(() => vi.restoreAllMocks());

describe('randomUuid', () => {
  it('güvenli olmayan bağlamda da geçerli bir v4 UUID üretir', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });
    try {
      const ids = new Set(Array.from({ length: 50 }, () => randomUuid()));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(isUuidV4(id)).toBe(true);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        value: original,
        configurable: true,
      });
    }
  });

  it('varsa tarayıcının kendi üretecini kullanır', () => {
    const spy = vi.spyOn(crypto, 'randomUUID');
    randomUuid();
    expect(spy).toHaveBeenCalled();
  });
});
