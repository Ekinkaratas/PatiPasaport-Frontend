import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { Footer } from './Footer';

beforeEach(async () => {
  await i18n.changeLanguage('tr');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Footer kaynak kod bağlantıları', () => {
  it('frontend ve backend depolarını GitHub simgesiyle yeni sekmede açar', () => {
    render(<Footer />);

    const frontend = screen.getByRole('link', {
      name: 'Frontend kaynak kodu, GitHub (yeni sekmede açılır)',
    });
    expect(frontend).toHaveAttribute(
      'href',
      'https://github.com/ornek/patipasaport-web',
    );
    expect(frontend).toHaveAttribute('target', '_blank');
    expect(frontend).toHaveAttribute('rel', 'noopener noreferrer');
    expect(frontend.querySelector('svg')).not.toBeNull();
    expect(
      screen.getByRole('link', {
        name: 'Backend kaynak kodu, GitHub (yeni sekmede açılır)',
      }),
    ).toHaveAttribute('href', 'https://github.com/ornek/patipasaport');
  });

  it('boş ya da https olmayan adresi göstermez', () => {
    vi.stubEnv('VITE_SOURCE_FRONTEND_URL', '');
    vi.stubEnv('VITE_SOURCE_BACKEND_URL', 'javascript:alert(1)');
    render(<Footer />);

    expect(screen.queryByText('Kaynak kod')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /kaynak kodu/ }),
    ).not.toBeInTheDocument();
  });
});
