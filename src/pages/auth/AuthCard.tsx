import type { ReactNode } from 'react';

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
    <div className="relative overflow-clip px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div aria-hidden="true" className="pp-halo" />

      <div className="relative mx-auto w-full max-w-[440px] max-lg:rounded-2xl max-lg:bg-surface max-lg:px-6 max-lg:py-8 max-lg:shadow-soft sm:max-lg:px-10 sm:max-lg:py-10 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-16 light:max-lg:ring-1 light:max-lg:ring-line">
        <div className="lg:sticky lg:top-28 lg:pt-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-balance text-fg lg:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-pretty text-fg-muted lg:mt-4 lg:max-w-md lg:text-lg">
            {subtitle}
          </p>
        </div>
        <div className="mt-8 lg:mt-0 lg:rounded-2xl lg:bg-surface lg:px-10 lg:py-10 lg:shadow-soft light:lg:ring-1 light:lg:ring-line">
          {children}
          {footer && (
            <div className="mt-8 border-t border-line pt-6 text-sm text-fg-muted">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
