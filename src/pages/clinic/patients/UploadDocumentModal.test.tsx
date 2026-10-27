import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { DocumentStatus, type Clinic } from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { apiFail, apiOk, installApi, renderInClinic } from '@/test/apiMock';
import { UploadDocumentModal } from './UploadDocumentModal';

const CLINIC_ID = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const PET = 'c8578f5b-8acb-4aea-8103-2d932c209069';
const DOC = '9b2f6c1e-3d4a-4b5c-8d6e-7f8091a2b3c4';
const CLINIC = { id: CLINIC_ID, name: 'Pati Test Kliniği' } as Clinic;

function renderModal() {
  return renderInClinic(
    <UploadDocumentModal
      clinicId={CLINIC_ID}
      petId={PET}
      petName="Pamuk Hanım"
      onClose={() => {}}
    />,
    { clinic: CLINIC, path: '/' },
  );
}

beforeEach(async () => {
  __resetSessionForTests();
  startSession({
    accessToken: 'AT',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresIn: 43200,
    userId: 'clinic-user',
    clinicId: CLINIC_ID,
  });
  await i18n.changeLanguage('tr');
});

afterEach(() => vi.unstubAllGlobals());

describe('UploadDocumentModal', () => {
  it('uygun olmayan dosyayı reddeder ve istek göndermez', async () => {
    const api = installApi(() => undefined);
    const user = userEvent.setup({ applyAccept: false });
    renderModal();

    await user.upload(
      screen.getByLabelText('Dosya'),
      new File(['merhaba'], 'not.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByRole('button', { name: 'Yükle' }));

    expect(
      screen.getByText(
        'Yalnızca PDF, JPG ya da PNG dosyası yükleyebilirsiniz.',
      ),
    ).toBeVisible();
    expect(api.requests).toHaveLength(0);
  });

  it('dosyayı form verisiyle yükler ve belge durumunu gösterir', async () => {
    const api = installApi(({ path, method }) => {
      if (
        path === `/api/clinics/${CLINIC_ID}/pets/${PET}/documents` &&
        method === 'POST'
      ) {
        return apiOk(
          {
            documentId: DOC,
            uploadedAt: '2026-10-17T10:00:00.000Z',
            status: 'QUEUED',
          },
          201,
        );
      }
      if (path === `/api/documents/${DOC}`) {
        return apiOk({
          document: {
            id: DOC,
            status: DocumentStatus.QUEUED,
            failureReason: '',
          },
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderModal();

    await user.upload(
      screen.getByLabelText('Dosya'),
      new File(['%PDF-1.4'], 'kan-tahlili.pdf', { type: 'application/pdf' }),
    );
    await user.type(screen.getByLabelText('Not'), 'Açlık kan şekeri');
    await user.click(screen.getByRole('button', { name: 'Yükle' }));

    expect(await screen.findByText('Sırada')).toBeVisible();
    const upload = api.find(
      'POST',
      `/api/clinics/${CLINIC_ID}/pets/${PET}/documents`,
    )[0]!;
    const form = upload.body as FormData;
    expect((form.get('file') as File).name).toBe('kan-tahlili.pdf');
    expect(form.get('note')).toBe('Açlık kan şekeri');
    const init = api.fetchMock.mock.calls[0]![1] as RequestInit;
    expect(
      (init.headers as Record<string, string>)['Content-Type'],
    ).toBeUndefined();
  });

  it('izin hatasını gösterir', async () => {
    installApi(({ method }) =>
      method === 'POST' ? apiFail(403, 'FORBIDDEN') : undefined,
    );
    const user = userEvent.setup();
    renderModal();

    await user.upload(
      screen.getByLabelText('Dosya'),
      new File(['x'], 'foto.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: 'Yükle' }));

    expect(await screen.findByRole('alert')).toBeVisible();
  });

  it.each([
    [
      'AI_PROVIDER_UNAVAILABLE',
      'Yapay zekâ servisine şu an ulaşılamıyor. Belgeyi daha sonra yeniden yükleyebilir ya da kaydı elle ekleyebilirsiniz.',
    ],
    ['SOMETHING_NEW', 'Hata kodu: SOMETHING_NEW'],
  ])('işlenemeyen belgede %s kodunu anlaşılır gösterir', async (code, text) => {
    installApi(({ path, method }) => {
      if (
        path === `/api/clinics/${CLINIC_ID}/pets/${PET}/documents` &&
        method === 'POST'
      ) {
        return apiOk(
          {
            documentId: DOC,
            uploadedAt: '2026-10-17T10:00:00.000Z',
            status: 'QUEUED',
          },
          201,
        );
      }
      if (path === `/api/documents/${DOC}`) {
        return apiOk({
          document: {
            id: DOC,
            status: DocumentStatus.FAILED,
            failureReason: code,
          },
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderModal();

    await user.upload(
      screen.getByLabelText('Dosya'),
      new File(['x'], 'foto.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: 'Yükle' }));

    expect(await screen.findByText(text)).toBeVisible();
    expect(screen.getByText('İncelenemedi')).toBeVisible();
  });
});
