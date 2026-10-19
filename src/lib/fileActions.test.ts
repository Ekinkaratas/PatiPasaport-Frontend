import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FILE_NOT_PREVIEWABLE,
  openFileInNewTab,
  saveFile,
} from './fileActions';

const PREVIEW_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function fakeTab() {
  return {
    opener: {} as unknown,
    location: { href: '' },
    document: { title: '', body: { textContent: '' } },
    close: vi.fn(),
  };
}

beforeEach(() => {
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:http://localhost/abc'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('openFileInNewTab', () => {
  it('sekmeyi dosya gelmeden açar, sonra blob adresine yönlendirir', async () => {
    const tab = fakeTab();
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValue(tab as unknown as Window);
    let resolve: (blob: Blob) => void = () => {};
    const pending = openFileInNewTab(
      () => new Promise<Blob>((r) => (resolve = r)),
      'Belge yükleniyor…',
      PREVIEW_TYPES,
    );

    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(tab.document.body.textContent).toBe('Belge yükleniyor…');
    resolve(new Blob(['%PDF'], { type: 'application/pdf' }));
    await pending;

    expect(tab.location.href).toBe('blob:http://localhost/abc');
    expect(tab.opener).toBeNull();
  });

  it('dosya alınamazsa açılan sekmeyi kapatır ve hatayı iletir', async () => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const error = new Error('404');

    await expect(
      openFileInNewTab(
        () => Promise.reject(error),
        'Yükleniyor',
        PREVIEW_TYPES,
      ),
    ).rejects.toBe(error);
    expect(tab.close).toHaveBeenCalled();
  });

  it.each([
    'text/html',
    'image/svg+xml',
    'application/xhtml+xml',
    'text/xml',
    '',
  ])("izinli olmayan türü (%s) uygulama origin'inde açmaz", async (type) => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

    await expect(
      openFileInNewTab(
        () => Promise.resolve(new Blob(['<script>1</script>'], { type })),
        'Yükleniyor',
        PREVIEW_TYPES,
      ),
    ).rejects.toMatchObject({ code: FILE_NOT_PREVIEWABLE });
    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.href).toBe('');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('izinli türü parametrelerinden arındırıp yeniden sarar', async () => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

    await openFileInNewTab(
      () =>
        Promise.resolve(new Blob(['%PDF'], { type: 'Application/PDF; x=1' })),
      'Yükleniyor',
      PREVIEW_TYPES,
    );

    const opened = vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob;
    expect(opened.type).toBe('application/pdf');
    expect(tab.location.href).toBe('blob:http://localhost/abc');
  });
});

describe('saveFile', () => {
  it('dosyayı verilen adla indirir', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('kan tahlili.pdf');
        expect(this.href).toBe('blob:http://localhost/abc');
      });

    await saveFile(() => Promise.resolve(new Blob(['x'])), 'kan tahlili.pdf');

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('sunucu türü ne olursa olsun octet-stream olarak indirir', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await saveFile(
      () => Promise.resolve(new Blob(['<html>'], { type: 'text/html' })),
      'belge.html',
    );

    const saved = vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob;
    expect(saved.type).toBe('application/octet-stream');
  });
});
