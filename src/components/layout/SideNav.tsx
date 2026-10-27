import { useEffect, useRef } from 'react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/cn';

export interface SideNavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
}

export function SideNav({
  label,
  items,
}: {
  label: string;
  items: SideNavItem[];
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('[aria-current="page"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const listBox = list.getBoundingClientRect();
    const itemBox = active.getBoundingClientRect();
    if (itemBox.left >= listBox.left && itemBox.right <= listBox.right) return;
    list.scrollLeft += itemBox.left - listBox.left - 16;
  }, [pathname]);

  return (
    <nav aria-label={label}>
      <ul
        ref={listRef}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
      >
        {items.map((item) => (
          <li key={item.to} className="shrink-0">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
                  isActive
                    ? 'text-fg inset-shadow-[3px_0_0_var(--color-accent)] dark:bg-surface-2 light:bg-surface light:shadow-soft'
                    : 'text-fg-muted ring-1 ring-line ring-inset hover:text-fg lg:ring-0',
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PanelShell({
  nav,
  children,
}: {
  nav: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-clip">
      <div aria-hidden="true" className="pp-halo" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-12">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          {nav}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
