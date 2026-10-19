import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAuth } from '@/auth/guards';
import { RootLayout } from '@/components/layout/RootLayout';
import { FullPageLoading } from '@/components/ui/FullPageLoading';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <FullPageLoading />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'panel',
            lazy: async () => ({
              Component: (await import('@/pages/panel/PanelLayout'))
                .PanelLayout,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/pages/panel/OverviewPage'))
                    .OverviewPage,
                }),
              },
              {
                path: 'pets',
                lazy: async () => ({
                  Component: (await import('@/pages/panel/pets/PetsPage'))
                    .PetsPage,
                }),
              },
              {
                path: 'pets/new',
                lazy: async () => ({
                  Component: (await import('@/pages/panel/pets/PetCreatePage'))
                    .PetCreatePage,
                }),
              },
              {
                path: 'pets/:petId',
                lazy: async () => ({
                  Component: (await import('@/pages/panel/pets/PetDetailPage'))
                    .PetDetailPage,
                }),
              },
              {
                path: 'pets/:petId/edit',
                lazy: async () => ({
                  Component: (await import('@/pages/panel/pets/PetEditPage'))
                    .PetEditPage,
                }),
              },
              {
                path: 'consents',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/panel/consents/ConsentsPage')
                  ).ConsentsPage,
                }),
              },
              {
                path: 'consents/new',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/panel/consents/GrantConsentPage')
                  ).GrantConsentPage,
                }),
              },
              {
                path: 'profile',
                lazy: async () => ({
                  Component: (await import('@/pages/panel/profile/ProfilePage'))
                    .ProfilePage,
                }),
              },
            ],
          },
          {
            path: 'clinic',
            lazy: async () => ({
              Component: (await import('@/pages/clinic/ClinicLayout'))
                .ClinicLayout,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/pages/clinic/ClinicOverviewPage'))
                    .ClinicOverviewPage,
                }),
              },
              {
                path: 'patients',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/clinic/patients/PatientsPage')
                  ).PatientsPage,
                }),
              },
              {
                path: 'patients/:petId',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/clinic/patients/PatientDetailPage')
                  ).PatientDetailPage,
                }),
              },
              {
                path: 'patients/:petId/records/new',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/clinic/patients/RecordCreatePage')
                  ).RecordCreatePage,
                }),
              },
              {
                path: 'drafts',
                lazy: async () => ({
                  Component: (await import('@/pages/clinic/drafts/DraftsPage'))
                    .DraftsPage,
                }),
              },
              {
                path: 'consents',
                lazy: async () => ({
                  Component: (await import('@/pages/clinic/ClinicConsentsPage'))
                    .ClinicConsentsPage,
                }),
              },
              {
                path: 'stock',
                lazy: async () => ({
                  Component: (await import('@/pages/clinic/stock/StockPage'))
                    .StockPage,
                }),
              },
              {
                path: 'stock/new',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/clinic/stock/StockCreatePage')
                  ).StockCreatePage,
                }),
              },
              {
                path: 'sales',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/clinic/sales/SalesReportPage')
                  ).SalesReportPage,
                }),
              },
              {
                path: 'sales/history',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/clinic/sales/SalesHistoryPage')
                  ).SalesHistoryPage,
                }),
              },
              {
                path: 'profile',
                lazy: async () => ({
                  Component: (
                    await import('@/pages/clinic/profile/ClinicProfilePage')
                  ).ClinicProfilePage,
                }),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
