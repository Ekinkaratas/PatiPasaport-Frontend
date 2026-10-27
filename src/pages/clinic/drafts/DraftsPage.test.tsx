import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import {
  DraftReviewStatus,
  RecordType,
  type Clinic,
  type DraftReview,
} from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { apiFail, apiOk, installApi, renderInClinic } from '@/test/apiMock';
import { DraftsPage } from './DraftsPage';

const CLINIC_ID = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const PET = 'c8578f5b-8acb-4aea-8103-2d932c209069';
const CLINIC = { id: CLINIC_ID, name: 'Pati Test Kliniği' } as Clinic;

function draft(overrides: Partial<DraftReview> = {}): DraftReview {
  return {
    id: '5d0e3f2a-1b2c-4d3e-8f40-516273849abc',
    petId: PET,
    clinicId: CLINIC_ID,
    sourceFiles: [
      {
        documentId: 'd1',
        storagePath: '',
        originalName: 'kan-tahlili.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        uploadedAt: '',
      },
    ],
    status: DraftReviewStatus.PENDING,
    reviewNote: '',
    createdRecordId: '',
    createdAt: '2026-10-17T09:00:00.000Z',
    reviewedAt: '',
    reviewedByClinicId: '',
    documentId: 'd1',
    proposal: {
      type: RecordType.LAB_RESULT,
      title: 'Kan tahlili',
      notes: '',
      recordedAt: '2026-10-16',
      labResult: {
        sampledAt: '2026-10-16',
        items: [
          {
            testName: 'ALT',
            value: '92',
            unit: 'U/L',
            referenceRange: '10-80',
            flag: 3,
          },
        ],
      },
    },
    approvedContent: null,
    modelVersion: 'vet-ocr-1',
    confidence: 0.87,
    ...overrides,
  };
}

function useBackend({
  drafts = [draft()],
  review,
}: {
  drafts?: DraftReview[];
  review?: () => Response;
} = {}) {
  return installApi(({ path, method }) => {
    if (path === '/api/draft-reviews') {
      return apiOk({
        draftReviews: drafts,
        total: drafts.length,
        page: 1,
        pageSize: 8,
      });
    }
    if (path === `/api/pets/${PET}`) {
      return apiOk({ pet: { id: PET, name: 'Pamuk Hanım' } });
    }
    if (path.endsWith('/review') && method === 'POST') {
      return (
        review?.() ??
        apiOk({
          draftReview: { ...drafts[0], status: DraftReviewStatus.APPROVED },
        })
      );
    }
    return undefined;
  });
}

function renderPage(initialEntry = '/clinic/drafts') {
  return renderInClinic(<DraftsPage />, {
    clinic: CLINIC,
    path: '/clinic/drafts',
    initialEntry,
  });
}

async function openReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'İncele' }));
  return screen.getByRole('dialog', {
    name: 'Taslak incelemesi · Pamuk Hanım',
  });
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

describe('DraftsPage', () => {
  it('bekleyen taslakları hasta adıyla listeler; filtre isteğe gider', async () => {
    const api = useBackend();
    const user = userEvent.setup();
    renderPage(`/clinic/drafts?pet=${PET}`);

    expect(
      await screen.findByRole('link', { name: 'Pamuk Hanım' }),
    ).toBeVisible();
    expect(screen.getByText('kan-tahlili.pdf')).toBeVisible();
    expect(screen.getByText('Hasta: Pamuk Hanım')).toBeVisible();
    const first = api.find('GET', '/api/draft-reviews')[0]!;
    expect(first.query.get('status')).toBe('1');
    expect(first.query.get('petId')).toBe(PET);

    await user.click(screen.getByRole('button', { name: 'Tümü' }));
    await waitFor(() =>
      expect(
        api
          .find('GET', '/api/draft-reviews')
          .some((request) => !request.query.has('status')),
      ).toBe(true),
    );
  });

  it('öneriyi olduğu gibi onaylar', async () => {
    const api = useBackend();
    const user = userEvent.setup();
    renderPage();

    const dialog = await openReview(user);
    expect(within(dialog).getByText('%87')).toBeVisible();
    expect(within(dialog).getByText('Yüksek')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Onayla' }));

    expect(
      await screen.findByText(
        'Pamuk Hanım için taslak onaylandı ve kayıt oluşturuldu.',
      ),
    ).toBeVisible();
    const review = api.requests.find((request) =>
      request.path.endsWith('/review'),
    )!;
    expect(review.body).toEqual({ approved: true });
  });

  it('reddederken not ister', async () => {
    const api = useBackend();
    const user = userEvent.setup();
    renderPage();

    const dialog = await openReview(user);
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }));
    expect(within(dialog).getByText('Reddetme nedenini yazın.')).toBeVisible();
    expect(api.requests.some((r) => r.path.endsWith('/review'))).toBe(false);

    await user.type(
      within(dialog).getByLabelText('İnceleme notu'),
      'Belge okunaksız',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }));
    await waitFor(() =>
      expect(
        api.requests.find((r) => r.path.endsWith('/review'))?.body,
      ).toEqual({ approved: false, reviewNote: 'Belge okunaksız' }),
    );
  });

  it('düzenleyerek onaylarken düzeltilmiş içeriği gönderir', async () => {
    const api = useBackend();
    const user = userEvent.setup();
    renderPage();

    const dialog = await openReview(user);
    await user.click(within(dialog).getByRole('button', { name: 'Düzenle' }));
    const title = within(dialog).getByLabelText('Başlık');
    await user.clear(title);
    await user.type(title, 'Biyokimya paneli');
    await user.click(
      within(dialog).getByRole('button', { name: 'Düzenleyerek onayla' }),
    );

    await waitFor(() =>
      expect(
        api.requests.find((r) => r.path.endsWith('/review'))?.body,
      ).toMatchObject({
        approved: true,
        editedContent: {
          type: RecordType.LAB_RESULT,
          title: 'Biyokimya paneli',
          labResult: {
            sampledAt: '2026-10-16',
            items: [{ testName: 'ALT', value: '92', flag: 3 }],
          },
        },
      }),
    );
  });

  it('eksik öneri olduğu gibi onaylanamaz', async () => {
    useBackend({
      drafts: [draft({ proposal: { ...draft().proposal!, recordedAt: '' } })],
    });
    const user = userEvent.setup();
    renderPage();

    const dialog = await openReview(user);
    expect(
      within(dialog).getByRole('button', { name: 'Onayla' }),
    ).toBeDisabled();
    expect(within(dialog).getByText(/önce düzenleyin/)).toBeVisible();
  });

  it('zaten incelenmiş taslakta uyarı gösterir', async () => {
    useBackend({ review: () => apiFail(409, 'CONFLICT') });
    const user = userEvent.setup();
    renderPage();

    const dialog = await openReview(user);
    await user.click(within(dialog).getByRole('button', { name: 'Onayla' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Bu taslak zaten incelenmiş.',
    );
  });

  it.each([
    [0.5, true],
    [0.51, false],
  ])(
    'güven %s iken düşük güven uyarısı görünürlüğü: %s',
    async (confidence, visible) => {
      useBackend({ drafts: [draft({ confidence })] });
      const user = userEvent.setup();
      renderPage();

      const dialog = await openReview(user);
      const note = within(dialog).queryByRole('note');
      if (visible) {
        expect(note).toHaveTextContent(
          'Yapay zekâ bu taslaktan emin değil. Tarihi ve değerleri belgeyle karşılaştırarak dikkatle kontrol edin.',
        );
      } else {
        expect(note).not.toBeInTheDocument();
        expect(
          within(dialog).queryByText(/Yapay zekâ bu taslaktan emin değil/),
        ).not.toBeInTheDocument();
      }
      expect(
        within(dialog).getByRole('button', { name: 'Onayla' }),
      ).toBeEnabled();
    },
  );
});
