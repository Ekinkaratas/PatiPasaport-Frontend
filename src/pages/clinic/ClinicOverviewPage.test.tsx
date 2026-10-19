import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { Clinic } from '@/api/types';
import { __resetSessionForTests, startSession } from '@/auth/session';
import { apiFail, apiOk, installApi, renderInClinic } from '@/test/apiMock';
import { ClinicOverviewPage } from './ClinicOverviewPage';

const CLINIC_ID = 'b5bcd2a4-b177-4980-b1fa-11261cb439f1';
const CLINIC = { id: CLINIC_ID, name: 'Pati Test Kliniği' } as Clinic;

function useBackend({ stockFails = false } = {}) {
  return installApi(({ path }) => {
    if (path === '/api/consents') {
      return apiOk({ consents: [], total: 3, page: 1, pageSize: 1 });
    }
    if (path === `/api/clinics/${CLINIC_ID}/stock-items`) {
      return stockFails
        ? apiFail(503, 'SERVICE_UNAVAILABLE')
        : apiOk({ items: [], total: 1, page: 1, pageSize: 8 });
    }
    if (path === `/api/clinics/${CLINIC_ID}/stock-sales/summary`) {
      return apiOk({
        totals: { revenue: 12345, cost: 0, profit: 12345, salesCount: 1 },
        daily: [],
        weekly: [],
        products: [],
      });
    }
    if (path === '/api/draft-reviews') {
      return apiOk({ draftReviews: [], total: 2, page: 1, pageSize: 8 });
    }
    return undefined;
  });
}

function stat(name: RegExp) {
  return screen.getByRole('link', { name });
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

describe('ClinicOverviewPage', () => {
  it('özet kartlarını sunucudaki sayılarla doldurur', async () => {
    useBackend();
    renderInClinic(<ClinicOverviewPage />, {
      clinic: CLINIC,
      path: '/clinic',
    });

    expect(await screen.findByText('₺123,45')).toBeInTheDocument();
    expect(
      await within(stat(/İzinli hasta/)).findByText('3'),
    ).toBeInTheDocument();
    expect(
      await within(stat(/Kritik seviyedeki ürün/)).findByText('1'),
    ).toBeInTheDocument();
    expect(
      await within(stat(/Onay bekleyen taslak/)).findByText('2'),
    ).toBeInTheDocument();
  });

  it('yüklenemeyen kart sonsuza dek beklemek yerine hata gösterir', async () => {
    useBackend({ stockFails: true });
    renderInClinic(<ClinicOverviewPage />, {
      clinic: CLINIC,
      path: '/clinic',
    });

    const critical = stat(/Kritik seviyedeki ürün/);
    expect(await within(critical).findByText('Yüklenemedi')).toBeVisible();
    expect(within(critical).getByText('—')).toBeInTheDocument();
    expect(
      await within(stat(/İzinli hasta/)).findByText('3'),
    ).toBeInTheDocument();
  });
});
