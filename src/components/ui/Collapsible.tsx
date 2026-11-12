import type { ReactNode, TransitionEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { ChevronDownIcon } from './icons';
import type { CollapsibleState } from './useCollapsible';

export function CollapseButton({
  state,
  label,
}: {
  state: CollapsibleState;
  label: string;
}) {
  const { t } = useTranslation();
  const text = state.open
    ? t('collapse.hide', { name: label })
    : t('collapse.show', { name: label });
  return (
    <button
      type="button"
      aria-expanded={state.open}
      aria-controls={state.id}
      aria-label={text}
      title={text}
      onClick={state.toggle}
      className="grid size-11 shrink-0 place-items-center rounded-xl text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <ChevronDownIcon
        className={cn(
          'size-5 transition-transform duration-300 ease-in-out',
          state.open && 'rotate-180',
        )}
      />
    </button>
  );
}

/** Yukarı-aşağı kayarak açılıp kapanan gövde. */
export function CollapseBody({
  state,
  className,
  children,
}: {
  state: CollapsibleState;
  className?: string;
  children: ReactNode;
}) {
  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) state.settle();
  };
  return (
    <div
      id={state.id}
      onTransitionEnd={onTransitionEnd}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
        state.open
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div
        inert={!state.open}
        className={cn(
          'min-h-0',
          state.open && state.settled ? 'overflow-visible' : 'overflow-hidden',
        )}
      >
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}
