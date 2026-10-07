import { createBrowserRouter } from 'react-router';
import type { Role } from '@/api/types';
import { ROUTES } from '@/auth/navigation';
import { HomeRedirect, RedirectIfAuthenticated, RequireAuth, RequireRole } from '@/auth/guards';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

const WORKERS: Role[] = ['EMPLOYEE', 'MANAGER', 'DIRECTEUR']; // everybody who clocks in
const SUPERVISORS: Role[] = ['MANAGER', 'DIRECTEUR'];

// Pages are lazy-loaded (one JS chunk per page): an employee never downloads the admin screens.
// Each page is wrapped in the role guard matching the backend @Roles(...) of the routes it calls.
export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            path: ROUTES.profile,
            lazy: async () => ({ Component: (await import('@/pages/employee/ProfilePage')).ProfilePage }),
          },
          {
            element: <RequireRole roles={WORKERS} />,
            children: [
              {
                path: ROUTES.clock,
                lazy: async () => ({ Component: (await import('@/pages/employee/ClockPage')).ClockPage }),
              },
              {
                path: ROUTES.myHours,
                lazy: async () => ({ Component: (await import('@/pages/employee/MyHoursPage')).MyHoursPage }),
              },
              {
                path: ROUTES.absences,
                lazy: async () => ({
                  Component: (await import('@/pages/employee/AbsencesPage')).AbsencesPage,
                }),
              },
            ],
          },
          {
            element: <RequireRole roles={['MANAGER']} />,
            children: [
              {
                path: ROUTES.teamDashboard,
                lazy: async () => {
                  const { TeamDashboardPage } = await import('@/pages/manager/TeamDashboardPage');
                  return { element: <TeamDashboardPage variant="team" /> };
                },
              },
            ],
          },
          {
            element: <RequireRole roles={['DIRECTEUR']} />,
            children: [
              {
                path: ROUTES.branchDashboard,
                lazy: async () => {
                  const { TeamDashboardPage } = await import('@/pages/manager/TeamDashboardPage');
                  return { element: <TeamDashboardPage variant="branch" /> };
                },
              },
            ],
          },
          {
            element: <RequireRole roles={SUPERVISORS} />,
            children: [
              {
                path: ROUTES.employees,
                lazy: async () => ({
                  Component: (await import('@/pages/manager/EmployeesPage')).EmployeesPage,
                }),
              },
              {
                path: ROUTES.teams,
                lazy: async () => ({ Component: (await import('@/pages/manager/TeamsPage')).TeamsPage }),
              },
              {
                path: ROUTES.requests,
                lazy: async () => ({
                  Component: (await import('@/pages/manager/RequestsPage')).RequestsPage,
                }),
              },
            ],
          },
          {
            element: <RequireRole roles={['MANAGER', 'ADMIN']} />,
            children: [
              {
                path: ROUTES.newEmployee,
                lazy: async () => ({
                  Component: (await import('@/pages/manager/EmployeeCreatePage')).EmployeeCreatePage,
                }),
              },
            ],
          },
          {
            element: <RequireRole roles={[...SUPERVISORS, 'ADMIN']} />,
            children: [
              {
                path: '/salaries/:id',
                lazy: async () => ({
                  Component: (await import('@/pages/manager/EmployeeDetailPage')).EmployeeDetailPage,
                }),
              },
            ],
          },
          {
            element: <RequireRole roles={['ADMIN']} />,
            children: [
              {
                path: ROUTES.adminDashboard,
                lazy: async () => ({
                  Component: (await import('@/pages/admin/AdminDashboardPage')).AdminDashboardPage,
                }),
              },
              {
                path: ROUTES.adminUsers,
                lazy: async () => ({ Component: (await import('@/pages/admin/UsersPage')).UsersPage }),
              },
              {
                path: ROUTES.adminBranches,
                lazy: async () => ({ Component: (await import('@/pages/admin/BranchesPage')).BranchesPage }),
              },
              {
                path: ROUTES.adminClocks,
                lazy: async () => ({ Component: (await import('@/pages/admin/ClocksPage')).ClocksPage }),
              },
            ],
          },
          {
            path: '*',
            lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).NotFoundPage }),
          },
        ],
      },
    ],
  },
]);
