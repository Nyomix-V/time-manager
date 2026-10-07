// Client HTTP de l'API Time Manager.
// EXPO_PUBLIC_API_URL est figée dans l'APK au moment du build (voir Dockerfile).
// 10.0.2.2 = la machine hôte vue depuis l'émulateur Android.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api';

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
