import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage } from './client';

function httpError(status: number, message?: string | string[]) {
  return new AxiosError('fail', 'ERR', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: message ? { message } : undefined,
  });
}

describe('getErrorMessage', () => {
  it('shows the business message of the backend as is', () => {
    expect(getErrorMessage(httpError(401, 'Email ou mot de passe incorrect'))).toBe(
      'Email ou mot de passe incorrect',
    );
  });
  it('falls back to a generic text for a bare 401', () => {
    expect(getErrorMessage(httpError(401, 'Unauthorized'))).toBe('Session expirée.');
  });
  it('turns a refused clock transition into a readable message', () => {
    expect(
      getErrorMessage(httpError(400, 'Pointage impossible maintenant (dernier : IN, demandé : IN)')),
    ).toMatch(/déjà été fait/);
  });
  it('joins NestJS validation messages', () => {
    expect(getErrorMessage(httpError(400, ['email must be an email', 'password too short']))).toBe(
      'email must be an email, password too short',
    );
  });
  it('explains a route missing on the backend', () => {
    expect(getErrorMessage(httpError(404, 'Cannot GET /teams'))).toMatch(/pas encore disponible/);
  });
  it('keeps a real "not found" message', () => {
    expect(getErrorMessage(httpError(404, 'Utilisateur introuvable'))).toBe('Utilisateur introuvable');
  });
  it('handles network errors', () => {
    expect(getErrorMessage(new AxiosError('Network Error'))).toMatch(/injoignable/);
  });
});
