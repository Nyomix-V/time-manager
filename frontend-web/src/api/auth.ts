import { api } from './client';
import type { LoginResponse } from './types';

export const MICROSOFT_LOGIN_URL = `${import.meta.env.VITE_API_URL ?? '/api'}/auth/microsoft`;

/**
 * Microsoft SSO is a full-page redirect, so a server error would show raw JSON.
 * We first ask the route without following the redirect: a redirect (to Microsoft)
 * means it is ready; otherwise we return a message to display on the login page.
 */
export async function checkMicrosoftLogin(): Promise<string | null> {
  try {
    const res = await fetch(MICROSOFT_LOGIN_URL, { redirect: 'manual', credentials: 'same-origin' });
    if (res.type === 'opaqueredirect' || res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    if (body.message?.includes('not configured')) {
      return "La connexion Microsoft n'est pas encore configurée sur ce serveur. Utilisez votre email et votre mot de passe.";
    }
    return body.message ?? `Connexion Microsoft indisponible (${res.status}).`;
  } catch {
    return 'Serveur injoignable. Vérifiez votre connexion.';
  }
}

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

// ⚠ Backend: not implemented yet (refresh token in an httpOnly cookie, see README).
export async function logout() {
  await api.post('/auth/logout');
}

/** The backend always answers 200 (no account enumeration). In dev it also returns the token, since no email is sent yet. */
export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{ token?: string }>('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, password: string) {
  await api.post('/auth/reset-password', { token, password });
}

/** First password of an invited user (link valid 48 h). */
export async function activateAccount(token: string, password: string) {
  await api.post('/auth/activate', { token, password });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}
