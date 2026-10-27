import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { DocumentStatus, type MedicalDocument } from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { apiFail, apiOk, installApi } from '@/test/apiMock';
import { renderRoute } from '@/test/renderWithProviders';
import { FULL_HEALTH_ACCESS } from './healthAccess';
import { HealthSection } from './HealthSection';

const PET = 'c8578f5b-8acb-4aea-8103-2d932c209069';
const CLINIC = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const DOC = '80336618-3822-43e9-8bd4-b019c1bae7fe';
const DRAFT_DOC = '91447729-4933-44fa-9ce5-c12ad2cbf8ff';

function doc(overrides: Partial<MedicalDocument>): MedicalDocument {
  return {
    id: DOC,
    petId: PET,
    clinicId: CLINIC,
    storagePath: 'x.pdf',
    originalName: 'kan tahlili.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    sha256: '',
    note: 'Açlık kan şekeri',
    status: DocumentStatus.QUEUED,
    failureReason: '',
    draftReviewId: '',
    createdAt: '2026-10-17T19:48:15.303Z',
    updatedAt: '2026-10-17T19:48:15.303Z',
    ...overrides,
  };
}

function useBackend(file: () => Response = () => pdf()) {
  return installApi(({ path }) => {
    if (path === `/api/clinics/${CLINIC}`) {
      return apiOk({ clinic: { id: CLINIC, name: 'Pati Test Kliniği' } });
    }
    if (path === `/api/pets/${PET}/records`) {
      return apiOk({ records: [], total: 0, page: 1, pageSize: 8 });
    }
    if (path === `/api/pets/${PET}/documents`) {
      const documents = [
        doc({}),
        doc({
          id: DRAFT_DOC,
          originalName: 'röntgen.png',
          mimeType: 'image/png',
          note: '',
          status: DocumentStatus.DRAFT_READY,
        }),
      ];
      return apiOk({ documents, total: 2, page: 1, pageSize: 8 });
    }
    if (path === `/api/documents/${DOC}/file`) return file();
    return undefined;
  });
}

function pdf() {
  return new Response(new Uint8Array([37, 80, 68, 70]), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  });
}

async function openDocumentsTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('tab', { name: 'Belgeler' }));
  return screen.findByText('kan tahlili.pdf');
}

beforeEach(async () => {
  __resetSessionForTests();
  startSession({
    accessToken: 'AT',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresIn: 43200,
    userId: 'owner',
    clinicId: '',
  });
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:http://localhost/doc'),
    revokeObjectURL: vi.fn(),
  });
  await i18n.changeLanguage('tr');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Belgeler sekmesi', () => {
  it('sahibe belgeleri klinik adı, durum ve notla listeler', async () => {
    useBackend();
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);

    const row = (await openDocumentsTab(user)).closest('li')!;
    expect(within(row).getByText('Sırada')).toBeVisible();
    expect(within(row).getByText('Not: Açlık kan şekeri')).toBeVisible();
    expect(await within(row).findByText(/Pati Test Kliniği/)).toBeVisible();
    expect(
      within(screen.getByText('röntgen.png').closest('li')!).getByText(
        'Taslak hazır',
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(
        'Yalnızca kliniğinizin yüklediği belgeler listelenir.',
      ),
    ).not.toBeInTheDocument();
  });

  it('dosyayı token ile alıp yeni sekmede açar', async () => {
    const api = useBackend();
    const tab = {
      opener: {},
      location: { href: '' },
      document: { title: '', body: { textContent: '' } },
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);
    await openDocumentsTab(user);

    await user.click(
      screen.getByRole('button', { name: 'Aç: kan tahlili.pdf' }),
    );

    await waitFor(() =>
      expect(tab.location.href).toBe('blob:http://localhost/doc'),
    );
    const request = api.find('GET', `/api/documents/${DOC}/file`)[0]!;
    expect(request.query.has('download')).toBe(false);
    const init = api.fetchMock.mock.calls.find(([url]) =>
      String(url).startsWith(`/api/documents/${DOC}/file`),
    )![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer AT',
    );
  });

  it('indirme ?download=1 ile ve dosyanın kendi adıyla yapılır', async () => {
    const api = useBackend();
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);
    await openDocumentsTab(user);

    await user.click(
      screen.getByRole('button', { name: 'İndir: kan tahlili.pdf' }),
    );

    await waitFor(() => expect(names).toEqual(['kan tahlili.pdf']));
    expect(
      api.find('GET', `/api/documents/${DOC}/file`)[0]?.query.get('download'),
    ).toBe('1');
  });

  it('bozuk dosyada açıklayıcı hata gösterir', async () => {
    useBackend(() => apiFail(500, 'INTERNAL_SERVER_ERROR'));
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);
    await openDocumentsTab(user);

    await user.click(
      screen.getByRole('button', { name: 'İndir: kan tahlili.pdf' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dosya doğrulanamadı',
    );
  });

  it('indirme yöneticisi dosyayı yakalarsa nedenini söyler', async () => {
    useBackend(() => new Response(null, { status: 204 }));
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);
    await openDocumentsTab(user);

    await user.click(
      screen.getByRole('button', { name: 'İndir: kan tahlili.pdf' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'indirme yöneticisi (ör. IDM)',
    );
  });

  it('bağlantı bir kez koparsa dosyayı yeniden ister ve açar', async () => {
    let attempts = 0;
    const api = useBackend(() => {
      attempts += 1;
      if (attempts === 1) throw new TypeError('Failed to fetch');
      return pdf();
    });
    const tab = {
      opener: {},
      location: { href: '' },
      document: { title: '', body: { textContent: '' } },
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);
    await openDocumentsTab(user);

    await user.click(
      screen.getByRole('button', { name: 'Aç: kan tahlili.pdf' }),
    );

    await waitFor(() =>
      expect(tab.location.href).toBe('blob:http://localhost/doc'),
    );
    expect(api.find('GET', `/api/documents/${DOC}/file`)).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ikinci denemede de bağlantı koparsa vazgeçip nedenini söyler', async () => {
    const api = useBackend(() => {
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);
    await openDocumentsTab(user);

    await user.click(
      screen.getByRole('button', { name: 'İndir: kan tahlili.pdf' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'indirme yöneticisi (ör. IDM)',
    );
    expect(api.find('GET', `/api/documents/${DOC}/file`)).toHaveLength(2);
  });

  it('klinik görünümünde yalnızca kendi belgeleri notunu ve taslak bağlantısını gösterir', async () => {
    useBackend();
    const user = userEvent.setup();
    renderRoute(
      <HealthSection
        petId={PET}
        access={FULL_HEALTH_ACCESS}
        ownClinicId={CLINIC}
      />,
    );
    await openDocumentsTab(user);

    expect(
      screen.getByText('Yalnızca kliniğinizin yüklediği belgeler listelenir.'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Taslağı incele' }),
    ).toHaveAttribute('href', `/clinic/drafts?pet=${PET}`);
  });

  it('hata kodunu anlaşılır metne çevirir, bilinmeyen kodu olduğu gibi gösterir', async () => {
    installApi(({ path }) => {
      if (path === `/api/clinics/${CLINIC}`) {
        return apiOk({ clinic: { id: CLINIC, name: 'Pati Test Kliniği' } });
      }
      if (path === `/api/pets/${PET}/records`) {
        return apiOk({ records: [], total: 0, page: 1, pageSize: 8 });
      }
      if (path === `/api/pets/${PET}/documents`) {
        const documents = [
          doc({
            status: DocumentStatus.FAILED,
            failureReason: 'TOO_MANY_PAGES',
          }),
          doc({
            id: DRAFT_DOC,
            originalName: 'röntgen.png',
            status: DocumentStatus.FAILED,
            failureReason: 'SOMETHING_NEW',
          }),
        ];
        return apiOk({ documents, total: 2, page: 1, pageSize: 8 });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderRoute(<HealthSection petId={PET} access={FULL_HEALTH_ACCESS} />);

    const known = (await openDocumentsTab(user)).closest('li')!;
    expect(
      within(known).getByText(
        'Belge 8 sayfadan uzun. Belgeyi bölerek yükleyin.',
      ),
    ).toBeVisible();
    expect(within(known).queryByText(/TOO_MANY_PAGES/)).not.toBeInTheDocument();
    const unknown = screen.getByText('röntgen.png').closest('li')!;
    expect(within(unknown).getByText('Hata kodu: SOMETHING_NEW')).toBeVisible();
  });
});
