import type { ReactNode } from 'react';
import { PawIcon } from '@/components/ui/PawIcon';

/** Giriş ve kayıt sayfalarının ortak çerçevesi. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden px-4 py-12 sm:py-16">
      <PawIcon className="pointer-events-none absolute -top-8 -left-10 size-48 -rotate-12 text-brand-100" />
      <PawIcon className="pointer-events-none absolute -right-12 bottom-0 size-56 rotate-12 text-cream-300/70" />

      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-3xl bg-white px-6 py-8 shadow-soft ring-1 ring-cream-300/60 sm:px-10 sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-cocoa-900">
            {title}
          </h1>
          <p className="mt-2 text-cocoa-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        {footer && (
          <div className="mt-6 text-center text-sm text-cocoa-600">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
