// Client HTTP de l'API Time Manager.
import { API_URL, MOCK } from './config';
import { mockRequest } from './mock';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
  if (MOCK) {
    try {
      return await mockRequest<T>(path, method, body);
    } catch (e) {
      throw new ApiError((e as { status?: number }).status ?? 500, e instanceof Error ? e.message : String(e));
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
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
