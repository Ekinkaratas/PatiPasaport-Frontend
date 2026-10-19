import type { ReactNode } from 'react';

export function PageHeader({
  title,
  lead,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-2xl font-extrabold tracking-tight text-balance text-cocoa-900 sm:text-3xl">
          {title}
        </h1>
        {lead && <p className="mt-1.5 text-cocoa-600">{lead}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
