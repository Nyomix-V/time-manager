import { api } from './client';
import type { LoginResponse } from './types';

export const MICROSOFT_LOGIN_URL = `${import.meta.env.VITE_API_URL ?? '/api'}/auth/microsoft`;

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
