import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AxiosError, AxiosHeaders } from 'axios';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';

const login = vi.fn();
vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ login }) }));

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <LoginPage /> },
      { path: '/', element: <p>accueil</p> },
    ],
    { initialEntries: ['/connexion'] },
  );
  render(<RouterProvider router={router} />);
}

describe('LoginPage', () => {
  // Braces matter: a function returned by beforeEach is run by Vitest as a teardown.
  beforeEach(() => {
    login.mockReset();
  });

  it('labels every field (accessibility)', () => {
    renderLogin();
    expect(screen.getByLabelText('Adresse email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password');
  });

  it('shows validation errors without calling the API', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText("L'adresse email est obligatoire.")).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse email')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  it('logs in and goes to the home page', async () => {
    login.mockResolvedValue(undefined);
    renderLogin();
    await userEvent.type(screen.getByLabelText('Adresse email'), 'employee@trinity.io');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(login).toHaveBeenCalledWith('employee@trinity.io', 'password123');
    expect(await screen.findByText('accueil')).toBeInTheDocument();
  });

  it('shows the server error on bad credentials', async () => {
    const error = new AxiosError('401', 'ERR', undefined, undefined, {
      status: 401,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { message: 'Email ou mot de passe incorrect' },
    });
    login.mockImplementation(async () => {
      throw error;
    });
    renderLogin();
    await userEvent.type(screen.getByLabelText('Adresse email'), 'employee@trinity.io');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect');
  });

  it('toggles password visibility', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'text');
  });
});
