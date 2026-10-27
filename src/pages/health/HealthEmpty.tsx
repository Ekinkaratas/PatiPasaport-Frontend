import type { ReactNode } from 'react';

export function HealthEmpty({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-bg px-4 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-fg-muted">
        {icon}
      </span>
      <p className="max-w-prose font-semibold text-fg">{children}</p>
    </div>
  );
}
