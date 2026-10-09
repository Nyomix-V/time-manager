import { takeTokenFromUrl } from './ssoToken';

describe('takeTokenFromUrl', () => {
  it('reads ?token= and removes it from the address bar', () => {
    window.history.replaceState(null, '', '/login?token=abc.def.ghi');
    expect(takeTokenFromUrl()).toEqual({ token: 'abc.def.ghi', error: null });
    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/login');
  });

  it('prefers #token= (never sent to a server) and clears the fragment', () => {
    window.history.replaceState(null, '', '/login#token=from-hash');
    expect(takeTokenFromUrl().token).toBe('from-hash');
    expect(window.location.hash).toBe('');
  });

  it('reports an error sent by the backend', () => {
    window.history.replaceState(null, '', '/login?error=Aucun%20compte');
    expect(takeTokenFromUrl()).toEqual({ token: null, error: 'Aucun compte' });
  });
});
