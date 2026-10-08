import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { MicrosoftCallbackPage } from './MicrosoftCallbackPage';

const loginWithToken = vi.fn();
vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ loginWithToken }) }));

function renderCallback(url: string) {
  window.history.replaceState(null, '', url); // the page reads the real address bar
  const router = createMemoryRouter(
    [
      { path: '/login', element: <MicrosoftCallbackPage /> },
      { path: '/', element: <p>accueil</p> },
    ],
    { initialEntries: ['/login'] },
  );
  render(<RouterProvider router={router} />);
}

describe('MicrosoftCallbackPage', () => {
  beforeEach(() => {
    loginWithToken.mockReset();
  });

  it('opens the session with the token, then goes home', async () => {
    loginWithToken.mockResolvedValue(undefined);
    renderCallback('/login?token=jwt-from-backend');
    expect(await screen.findByText('accueil')).toBeInTheDocument();
    expect(loginWithToken).toHaveBeenCalledOnce();
    expect(loginWithToken).toHaveBeenCalledWith('jwt-from-backend');
    expect(window.location.search).toBe(''); // token no longer in the URL
  });

  it('explains when no token came back', async () => {
    renderCallback('/login');
    expect(await screen.findByRole('alert')).toHaveTextContent('aucun jeton reçu');
    expect(loginWithToken).not.toHaveBeenCalled();
  });

  it('shows the error when the token is refused', async () => {
    loginWithToken.mockRejectedValue(new Error('Session expirée.'));
    renderCallback('/login?token=expired');
    expect(await screen.findByRole('alert')).toHaveTextContent('Session expirée.');
    expect(screen.getByRole('link', { name: 'Réessayer' })).toHaveAttribute('href', '/api/auth/microsoft');
  });
});
