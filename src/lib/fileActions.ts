import { ApiError } from '@/api/errors';

const REVOKE_DELAY_MS = 60_000;

/** Sunucunun bildirdiği tür önizlemeye izinli değilse fırlatılır. */
export const FILE_NOT_PREVIEWABLE = 'FILE_NOT_PREVIEWABLE';

const DOWNLOAD_TYPE = 'application/octet-stream';

function baseType(type: string): string {
  return (type.split(';', 1)[0] ?? '').trim().toLowerCase();
}

function showLoading(tab: Window, text: string): void {
  try {
    tab.document.title = text;
    tab.document.body.textContent = text;
  } catch {
    return;
  }
}

/**
 * Dosyayı yeni sekmede uygulamanın origin'inde açar. Blob türü sunucudan
 * geldiği için yalnızca `previewTypes` içindeki türler açılır ve bayt'lar o
 * türle yeniden sarılır; HTML/SVG gibi aktif içerik asla render edilmez.
 */
export async function openFileInNewTab(
  load: () => Promise<Blob>,
  loadingText: string,
  previewTypes: readonly string[],
): Promise<void> {
  const tab = window.open('', '_blank');
  if (tab) showLoading(tab, loadingText);
  let blob: Blob;
  try {
    blob = await load();
  } catch (error) {
    tab?.close();
    throw error;
  }
  const type = baseType(blob.type);
  if (!previewTypes.includes(type)) {
    tab?.close();
    throw new ApiError({ status: 0, code: FILE_NOT_PREVIEWABLE });
  }
  const url = URL.createObjectURL(new Blob([blob], { type }));
  if (tab) {
    tab.opener = null;
    tab.location.href = url;
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/** İndirir; tür ne olursa olsun tarayıcı içeriği yorumlamasın diye octet-stream. */
export async function saveFile(
  load: () => Promise<Blob>,
  fileName: string,
): Promise<void> {
  const blob = await load();
  const url = URL.createObjectURL(new Blob([blob], { type: DOWNLOAD_TYPE }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
