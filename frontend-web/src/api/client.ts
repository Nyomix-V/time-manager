import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Single HTTP client. Same-origin `/api` (nginx in Docker, Vite proxy in local dev) -> no CORS.
//
// Token strategy:
//  - the short-lived access token lives ONLY in memory (this module), never in localStorage,
//    so an XSS cannot read it from storage;
//  - the refresh token is an httpOnly cookie set by the backend, sent automatically with
//    `withCredentials` and unreadable from JavaScript;
//  - on a 401 we call POST /auth/refresh once, then replay the original request.

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  timeout: 15_000,
});

let accessToken: string | null = null;
let onSessionExpired: () => void = () => {};

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Concurrent 401s share one refresh call (and React StrictMode double effects too).
let refreshing: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshing ??= api
    .post<{ access_token: string }>('/auth/refresh')
    .then((res) => {
      setAccessToken(res.data.access_token);
      return res.data.access_token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (error.response?.status !== 401 || !config || config._retried || isAuthCall) {
      throw error;
    }
    config._retried = true;
    try {
      await refreshAccessToken();
      return api(config);
    } catch {
      setAccessToken(null);
      onSessionExpired();
      throw error;
    }
  },
);

/** Human-readable message from a NestJS error (`message` can be a string or a list from ValidationPipe). */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Serveur injoignable. Vérifiez votre connexion.';
    const data = error.response.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    switch (error.response.status) {
      case 401:
        return msg === 'Invalid credentials' ? 'Email ou mot de passe incorrect.' : 'Session expirée.';
      case 403:
        return "Vous n'avez pas les droits pour cette action.";
      case 404:
        // Nest answers "Cannot GET /teams" for a route that does not exist (yet).
        return msg && !msg.startsWith('Cannot ')
          ? msg
          : "Cette fonctionnalité n'est pas encore disponible côté serveur.";
      default:
        return msg ?? `Erreur serveur (${error.response.status}).`;
    }
  }
  return error instanceof Error ? error.message : 'Erreur inattendue.';
}
