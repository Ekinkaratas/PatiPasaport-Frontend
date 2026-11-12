import { useId, useState } from 'react';

/**
 * Bir kartın gövdesini açıp kapatma durumu. Kart her açılışta açık gelir.
 * `settled`, yükseklik animasyonu bitene kadar içeriğin taşmasını gizlemek
 * için tutulur; animasyon bitince odak çerçeveleri ve gölgeler kesilmez.
 */
export function useCollapsible(initialOpen = true) {
  const id = useId();
  const [open, setOpen] = useState(initialOpen);
  const [settled, setSettled] = useState(true);
  return {
    id,
    open,
    settled,
    toggle: () => {
      setOpen((value) => !value);
      setSettled(false);
    },
    settle: () => setSettled(true),
  };
}

export type CollapsibleState = ReturnType<typeof useCollapsible>;
