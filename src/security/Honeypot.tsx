import { useId } from 'react';
import type { HoneypotState } from './useBotGuard';

export function Honeypot({ value, onChange }: HoneypotState) {
  const id = useId();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-[10000px] size-px overflow-hidden opacity-0"
    >
      <label htmlFor={id}>Bu alanı boş bırakın</label>
      <input
        id={id}
        type="text"
        name="pp_contact_reference"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
