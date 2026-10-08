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
  it('translates bad credentials', () => {
    expect(getErrorMessage(httpError(401, 'Invalid credentials'))).toBe('Email ou mot de passe incorrect.');
  });
  it('explains a non-activated account', () => {
    expect(getErrorMessage(httpError(401, 'Account not activated'))).toMatch(/Compte non activé/);
  });
  it('turns a refused clock transition into a readable message', () => {
    expect(getErrorMessage(httpError(400, 'Invalid transition: last=IN next=IN'))).toMatch(/déjà été fait/);
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
    expect(getErrorMessage(httpError(404, 'User not found'))).toBe('User not found');
  });
  it('handles network errors', () => {
    expect(getErrorMessage(new AxiosError('Network Error'))).toMatch(/injoignable/);
  });
});
