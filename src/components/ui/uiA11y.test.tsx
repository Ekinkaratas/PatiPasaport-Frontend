import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { LoadingBlock } from './LoadingBlock';
import { TableScroll } from './TableScroll';

describe('erişilebilirlik yardımcıları', () => {
  it('yükleme göstergesi meşgul durumunu bildirir', () => {
    render(<LoadingBlock />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('kaydırılabilir tablo alanı klavyeyle odaklanabilir ve adlandırılmıştır', () => {
    render(
      <TableScroll label="Haftalık satışlar">
        <table>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </TableScroll>,
    );
    const region = screen.getByRole('region', { name: 'Haftalık satışlar' });
    expect(region).toHaveAttribute('tabindex', '0');
  });
});
