import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import type { Role, User } from '@/api/types';
import { RequireAuth, RequireRole } from './guards';

const authState = vi.hoisted(() => ({ current: { status: 'loading', user: null } as unknown }));
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ state: authState.current }) }));

const user = (role: Role): User => ({
  id: '1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@trinity.io',
  role,
  createdAt: '',
  updatedAt: '',
});

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <p>page connexion</p> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/pointage', element: <p>page pointage</p> },
          { path: '/admin', element: <p>page admin home</p> },
          {
            element: <RequireRole roles={['ADMIN']} />,
            children: [{ path: '/admin/utilisateurs', element: <p>page utilisateurs</p> }],
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

describe('route guards', () => {
  it('sends anonymous visitors to the login page', () => {
    authState.current = { status: 'anonymous', user: null };
    renderAt('/pointage');
    expect(screen.getByText('page connexion')).toBeInTheDocument();
  });

  it('shows a spinner while the session is being restored', () => {
    authState.current = { status: 'loading', user: null };
    renderAt('/pointage');
    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
  });

  it('lets an admin open an admin page', () => {
    authState.current = { status: 'authenticated', user: user('ADMIN') };
    renderAt('/admin/utilisateurs');
    expect(screen.getByText('page utilisateurs')).toBeInTheDocument();
  });

  it('redirects an employee who types an admin URL to their home', () => {
    authState.current = { status: 'authenticated', user: user('EMPLOYEE') };
    renderAt('/admin/utilisateurs');
    expect(screen.queryByText('page utilisateurs')).not.toBeInTheDocument();
    expect(screen.getByText('page pointage')).toBeInTheDocument();
  });
});
