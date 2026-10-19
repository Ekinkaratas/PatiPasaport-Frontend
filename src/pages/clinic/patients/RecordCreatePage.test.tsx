import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { RecordType, type Clinic } from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { todayInBusinessTimeZone } from '@/lib/format';
import { apiFail, apiOk, installApi, renderInClinic } from '@/test/apiMock';
import { RecordCreatePage } from './RecordCreatePage';

const CLINIC_ID = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const PET = 'c8578f5b-8acb-4aea-8103-2d932c209069';
const CLINIC = { id: CLINIC_ID, name: 'Pati Test Kliniği' } as Clinic;

function useBackend({
  scopes,
  create,
}: {
  scopes: string[];
  create?: () => Response;
}) {
  return installApi(({ path, method, body }) => {
    if (path === `/api/clinics/${CLINIC_ID}/pets/${PET}/overview`) {
      return apiOk({
        pet: {
          petId: PET,
          name: 'Pamuk Hanım',
          species: 'CAT',
          breed: 'CAT_TURKISH_ANGORA',
          birthDate: '',
          chipNumberMasked: '',
          ownerUserId: 'o1',
        },
        owner: null,
        recentRecords: [],
        pendingDraftReviewCount: 0,
        unavailableSources: [],
      });
    }
    if (path === '/api/consents') {
      return apiOk({
        consents: [
          {
            consentId: 'c1',
            status: 1,
            ownerUserId: 'o1',
            clinicId: CLINIC_ID,
            petId: PET,
            scopes,
            grantedAt: '2026-10-16T10:00:00.000Z',
            expiresAt: '2027-01-16T20:59:59.000Z',
            revokedAt: '',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 128,
      });
    }
    if (path === `/api/pets/${PET}/records` && method === 'POST') {
      return (
        create?.() ??
        apiOk(
          {
            record: {
              id: 'r1',
              ...(body as { content: object }).content,
              petId: PET,
              clinicId: CLINIC_ID,
              attachments: [],
              sourceDraftReviewId: '',
              createdAt: '2026-10-17T10:00:00.000Z',
            },
          },
          201,
        )
      );
    }
    return undefined;
  });
}

function renderPage() {
  return renderInClinic(<RecordCreatePage />, {
    clinic: CLINIC,
    path: '/clinic/patients/:petId/records/new',
    initialEntry: `/clinic/patients/${PET}/records/new`,
    extraRoutes: [
      { path: '/clinic/patients/:petId', element: <p>hasta sayfası</p> },
    ],
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

describe('RecordCreatePage', () => {
  it('medical_write izni yoksa formu göstermez', async () => {
    useBackend({ scopes: ['medical_read'] });
    renderPage();

    expect(
      await screen.findByText(/"Tıbbi kayıt ekleme" kapsamı olmalı/),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Kaydı oluştur' }),
    ).not.toBeInTheDocument();
  });

  it('eksik alanları gösterir ve istek göndermez', async () => {
    const api = useBackend({ scopes: ['medical_write'] });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Kaydı oluştur' }),
    );
    expect(screen.getByText('Kayıt türünü seçin.')).toBeVisible();
    expect(screen.getByText('Başlık boş bırakılamaz.')).toBeVisible();
    expect(api.find('POST', `/api/pets/${PET}/records`)).toHaveLength(0);
  });

  it('aşı kaydını oluşturur ve hasta sayfasına döner', async () => {
    const api = useBackend({ scopes: ['medical_write'] });
    const user = userEvent.setup();
    const { router } = renderPage();
    const today = todayInBusinessTimeZone();

    await user.click(await screen.findByLabelText('Aşı'));
    await user.type(screen.getByLabelText('Başlık'), 'Kuduz aşısı');
    await user.type(screen.getByRole('textbox', { name: 'Aşı' }), 'Rabisin');
    fireEvent.change(screen.getByLabelText('Sonraki doz'), {
      target: { value: '2027-10-17' },
    });
    await user.click(screen.getByRole('button', { name: 'Kaydı oluştur' }));

    expect(await screen.findByText('hasta sayfası')).toBeVisible();
    expect(router.state.location.pathname).toBe(`/clinic/patients/${PET}`);
    expect(api.find('POST', `/api/pets/${PET}/records`)[0]?.body).toEqual({
      content: {
        type: RecordType.VACCINATION,
        title: 'Kuduz aşısı',
        notes: '',
        recordedAt: today,
        vaccination: {
          vaccineName: 'Rabisin',
          batchNumber: '',
          administeredAt: today,
          nextDueAt: '2027-10-17',
        },
      },
    });
    expect(screen.getByText('"Kuduz aşısı" kaydı oluşturuldu.')).toBeVisible();
  });

  it('sunucu ayrıntısız 400 dönerse genel uyarı gösterir', async () => {
    useBackend({
      scopes: ['medical_write'],
      create: () => apiFail(400, 'BAD_REQUEST'),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText('Muayene'));
    await user.type(screen.getByLabelText('Başlık'), 'Genel kontrol');
    await user.click(screen.getByRole('button', { name: 'Kaydı oluştur' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Kayıt bilgilerinden biri sunucu tarafından kabul edilmedi.',
    );
  });
});
