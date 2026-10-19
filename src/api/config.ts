/** Tarayıcının API'ye gittiği taban yol (Vite proxy / reverse proxy arkasında gateway). */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL.replace(
  /\/+$/,
  '',
);

/**
 * Gateway her istekte `x-client-type` başlığını ister: `1` = WEB, `2` = MOBILE.
 * Token'lar istemci türüne bağlanır; web'de alınan token mobilde çalışmaz.
 */
export const CLIENT_TYPE_HEADER = 'X-Client-Type';
export const CLIENT_TYPE_WEB = '1';

/** Gateway gelen UUID'yi aynen kullanır ve yanıt gövdesinde geri döner. */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const REQUEST_TIMEOUT_MS = 15_000;
