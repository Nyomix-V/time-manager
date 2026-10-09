/**
 * Reads the JWT out of the URL and removes it right away, before anything else:
 * a token left in the address bar would end up in the history, in screenshots
 * or in a shared link. Accepts `#token=` (preferred: never sent to any server)
 * and `?token=` (what the backend sends today).
 */
export function takeTokenFromUrl(): { token: string | null; error: string | null } {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const token = hash.get('token') ?? url.searchParams.get('token');
  const error = hash.get('error') ?? url.searchParams.get('error');
  window.history.replaceState(window.history.state, '', url.pathname);
  return { token, error };
}
