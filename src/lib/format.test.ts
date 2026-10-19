import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatMoney,
  formatMonth,
  formatPhone,
  monthInBusinessTimeZone,
  normalizeTrMobilePhone,
  normalizeTrPhone,
  todayInBusinessTimeZone,
} from './format';

describe('telefon', () => {
  it.each(['5551234567', '05551234567', '+905551234567', '0555 123 45 67'])(
    'cep: %s -> +905551234567',
    (input) => expect(normalizeTrMobilePhone(input)).toBe('+905551234567'),
  );

  it('sabit hat cep normalizasyonundan geçmez ama genel normalizasyondan geçer', () => {
    expect(normalizeTrMobilePhone('0212 123 45 67')).toBe('02121234567');
    expect(normalizeTrPhone('0212 123 45 67')).toBe('+902121234567');
    expect(normalizeTrPhone('0850 123 45 67')).toBe('+908501234567');
  });

  it('dile göre gösterir', () => {
    expect(formatPhone('+905551234567', 'tr')).toBe('0555 123 45 67');
    expect(formatPhone('+905551234567', 'en')).toBe('+90 555 123 45 67');
  });
});

describe('tarih', () => {
  it('YYYY-AA-GG tarihini gün kaydırmadan biçimler', () => {
    expect(formatDate('2024-03-01', 'tr')).toBe('1 Mart 2024');
    expect(formatDate('2024-03-01', 'en')).toBe('1 March 2024');
  });

  it('boş değer için boş döner', () => {
    expect(formatDate('', 'tr')).toBe('');
  });

  it('bugünü Türkiye saatine göre hesaplar', () => {
    // 2024-12-31 22:30 UTC = 2025-01-01 01:30 İstanbul
    expect(todayInBusinessTimeZone(new Date('2024-12-31T22:30:00Z'))).toBe(
      '2025-01-01',
    );
  });
});

describe('para ve ay', () => {
  it('kuruşu seçili dilde TL olarak gösterir', () => {
    expect(formatMoney(14990, 'tr')).toBe('₺149,90');
    expect(formatMoney(123456789, 'tr')).toBe('₺1.234.567,89');
    expect(formatMoney(14990, 'en')).toBe('₺149.90');
    expect(formatMoney(-500, 'tr')).toBe('-₺5,00');
  });

  it('ayı Türkiye saatine göre hesaplar ve adıyla gösterir', () => {
    expect(monthInBusinessTimeZone(new Date('2026-10-31T21:30:00Z'))).toBe(
      '2026-11',
    );
    expect(formatMonth('2026-10', 'tr')).toBe('Ekim 2026');
    expect(formatMonth('2026-10', 'en')).toBe('October 2026');
  });
});
