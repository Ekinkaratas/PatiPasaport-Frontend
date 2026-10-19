import { useEffect } from 'react';

const APP_NAME = 'PatiPasaport';

/** Sekme başlığı: `Giriş yap · PatiPasaport`; başlık yoksa yalnızca uygulama adı. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
