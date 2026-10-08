// Client HTTP de l'API Time Manager. En mode démo, les requêtes vont au faux backend (src/mock).
import { mockRequest } from '@/mock/server';
import { API_URL, MOCK } from './config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Jeton de la session en cours, fourni par AuthProvider.
let authToken: string | null = null;
export const setApiToken = (token: string | null) => {
  authToken = token;
};

// Appelé quand l'API refuse le jeton (expiré, révoqué) : AuthProvider déconnecte et renvoie à l'écran de connexion.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

async function withSessionCheck<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && authToken) onUnauthorized?.();
    throw e;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
};

const toQueryString = (query: RequestOptions['query'] = {}) => {
  const pairs = Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined);
  return pairs.length ? `?${pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : '';
};

export function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return withSessionCheck(send<T>(path, options));
}

async function send<T>(path: string, { method = 'GET', body, query }: RequestOptions): Promise<T> {
  const url = `${path}${toQueryString(query)}`;

  if (MOCK) {
    try {
      return await mockRequest<T>(url, method, body, authToken);
    } catch (e) {
      throw new ApiError((e as { status?: number }).status ?? 500, e instanceof Error ? e.message : String(e));
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${url}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.');
  }

  if (!response.ok) {
    // NestJS renvoie { message: string | string[] } en cas d'erreur.
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message) ? payload.message.join('\n') : payload?.message;
    throw new ApiError(response.status, message ?? `Erreur ${response.status}`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
