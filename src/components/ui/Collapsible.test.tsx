import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { CollapseBody, CollapseButton } from './Collapsible';
import { useCollapsible } from './useCollapsible';

function Example() {
  const state = useCollapsible();
  return (
    <section>
      <CollapseButton state={state} label="Bilgiler" />
      <CollapseBody state={state}>
        <button type="button">İçerik düğmesi</button>
      </CollapseBody>
    </section>
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('tr');
});

describe('Collapsible', () => {
  it('açık başlar; kapatınca içerik etkisiz olur, açınca geri gelir', async () => {
    const user = userEvent.setup();
    render(<Example />);

    const toggle = screen.getByRole('button', {
      name: 'Bilgiler bölümünü kapat',
    });
    const body = document.getElementById(
      toggle.getAttribute('aria-controls') ?? '',
    )!;
    const inner = body.firstElementChild as HTMLElement;
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(inner).not.toHaveAttribute('inert');
    expect(inner.className).toContain('overflow-visible');

    await user.click(toggle);

    expect(
      screen.getByRole('button', { name: 'Bilgiler bölümünü aç' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(inner).toHaveAttribute('inert');
    expect(body.className).toContain('grid-rows-[0fr]');

    await user.click(
      screen.getByRole('button', { name: 'Bilgiler bölümünü aç' }),
    );

    expect(inner).not.toHaveAttribute('inert');
    expect(body.className).toContain('grid-rows-[1fr]');
    expect(inner.className).toContain('overflow-hidden');

    fireEvent.transitionEnd(body);

    expect(inner.className).toContain('overflow-visible');
  });

  it('içerideki geçişlerin bitişi gövdeyi oturmuş saymaz', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const toggle = screen.getByRole('button', {
      name: 'Bilgiler bölümünü kapat',
    });
    const body = document.getElementById(
      toggle.getAttribute('aria-controls') ?? '',
    )!;
    const inner = body.firstElementChild as HTMLElement;

    await user.click(toggle);
    await user.click(
      screen.getByRole('button', { name: 'Bilgiler bölümünü aç' }),
    );
    fireEvent.transitionEnd(screen.getByText('İçerik düğmesi'));

    expect(inner.className).toContain('overflow-hidden');
  });
});
