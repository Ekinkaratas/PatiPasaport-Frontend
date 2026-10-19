import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import type { Consent, Pet } from '@/api/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { isUuidV4 } from '@/lib/ids';
import { ConsentCard } from '@/pages/panel/consents/ConsentCard';

const PAYLOAD =
  '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';

const pet: Pet = {
  id: '9a8b7c6d-5e4f-4a3b-8c2d-0987654321fe',
  name: PAYLOAD,
  species: 'CAT',
  breed: 'MIXED',
  sex: 2,
  birthDate: '',
  isBirthDateEstimated: false,
  isNeutered: false,
  ownerUserId: 'o',
  chipNumberMasked: '',
  chipNumber: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const consent: Consent = {
  consentId: 'c1',
  status: 1,
  ownerUserId: 'o',
  clinicId: '3f1c2a4e-8b7d-4c1e-9a2b-1234567890ab',
  petId: pet.id,
  scopes: [PAYLOAD, 'medical_read'],
  grantedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-12-01T00:00:00.000Z',
  revokedAt: '',
};

describe('XSS: sunucudan gelen metinler HTML olarak yorumlanmaz', () => {
  it('klinik adı, hayvan adı ve bilinmeyen kapsam düz metin olarak çizilir', () => {
    const { container } = render(
      <MemoryRouter>
        <ConsentCard
          consent={consent}
          pet={pet}
          clinic={{
            id: consent.clinicId,
            name: PAYLOAD,
            taxNumber: '1234',
            phone: '+902121234567',
            email: 'a@b.test',
            isActive: true,
            createdAt: '',
            updatedAt: '',
          }}
          onRevoke={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(container.querySelector('img, script')).toBeNull();
    expect(container.textContent).toContain(PAYLOAD);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('hata mesajı olarak gelen metin çevrilir ya da genel mesaja düşer, HTML çizilmez', () => {
    const { container } = render(<ErrorAlert error={PAYLOAD} />);
    expect(container.querySelector('img, script')).toBeNull();
  });
});

describe('isUuidV4', () => {
  it.each([
    ['3f1c2a4e-8b7d-4c1e-9a2b-1234567890ab', true],
    ['3F1C2A4E-8B7D-4C1E-9A2B-1234567890AB', true],
    ['../../users/me', false],
    ['3f1c2a4e-8b7d-1c1e-9a2b-1234567890ab', false],
    ['', false],
    [null, false],
  ])('%s -> %s', (value, expected) => {
    expect(isUuidV4(value)).toBe(expected);
  });
});
