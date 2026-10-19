import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { XIcon } from './icons';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Yerel `<dialog>` üzerine kurulu modal: odak tuzağı, Esc ile kapanma ve
 * arka planın etkisiz kalması tarayıcıdan gelir.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        // Esc: durumu React yönetsin.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Arka plana (dialog kutusunun dışına) tıklanınca kapat.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-white p-0 text-cocoa-800 shadow-soft',
        'backdrop:bg-cocoa-900/40 backdrop:backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-cream-300 px-6 py-4">
          <h2 id={titleId} className="text-xl font-extrabold text-cocoa-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('actions.close')}
            className="-mr-2 rounded-full p-2 text-cocoa-500 hover:bg-cream-200 hover:text-cocoa-800"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        {children}
        {footer && (
          <div className="border-t border-cream-300 px-6 py-4">{footer}</div>
        )}
      </div>
    </dialog>
  );
}
