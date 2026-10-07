import { api } from './client';
import type { LoginResponse } from './types';

export const MICROSOFT_LOGIN_URL = `${import.meta.env.VITE_API_URL ?? '/api'}/auth/microsoft`;

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

// ⚠ Backend: to implement (refresh token in an httpOnly cookie, see README).
export async function logout() {
  await api.post('/auth/logout');
}

// ⚠ Backend: to implement.
export async function requestPasswordReset(email: string) {
  await api.post('/auth/forgot-password', { email });
}

// ⚠ Backend: to implement.
export async function changePassword(currentPassword: string, newPassword: string) {
  await api.put('/auth/password', { currentPassword, newPassword });
}
