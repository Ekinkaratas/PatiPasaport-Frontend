import { describe, expect, it } from 'vitest';
import { parseMoney, toMoneyInput } from './money';

describe('para girişi', () => {
  it.each([
    ['149', 14900],
    ['149,9', 14990],
    ['149.90', 14990],
    [' 0,05 ', 5],
    ['0', 0],
    ['10000000', 1_000_000_000],
  ])('%s -> %s kuruş', (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  it.each([
    '',
    '1.000,50',
    '12,345',
    '-5',
    '1e3',
    '12,',
    ',5',
    'abc',
    '123456789',
  ])('%s geçersiz', (raw) => {
    expect(parseMoney(raw)).toBeNull();
  });

  it('kuruşu dile uygun giriş değerine çevirir', () => {
    expect(toMoneyInput(14990, 'tr')).toBe('149,90');
    expect(toMoneyInput(5, 'en')).toBe('0.05');
    expect(toMoneyInput(undefined, 'tr')).toBe('');
  });
});
