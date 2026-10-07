// Faux backend du mode démo : répond aux mêmes routes que l'API, avec des données en mémoire.
// Les données repartent de zéro à chaque redémarrage de l'app.
import type { Role } from '@/auth/session';

export const MOCK_PASSWORD = 'demo1234';

export const MOCK_ACCOUNTS: { email: string; role: Role; label: string }[] = [
  { email: 'employe@demo.fr', role: 'EMPLOYEE', label: 'Employé' },
  { email: 'manager@demo.fr', role: 'MANAGER', label: 'Manager' },
  { email: 'directeur@demo.fr', role: 'DIRECTEUR', label: 'Directeur' },
  { email: 'admin@demo.fr', role: 'ADMIN', label: 'Admin' },
];

type MockClock = { id: string; userId: string; status: 'IN' | 'OUT'; time: string };
const clocks: MockClock[] = [];

const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Jeton au même format que celui du backend, marqué "mock" pour ne jamais être accepté hors du mode démo.
function mockToken(email: string, role: Role) {
  const payload = {
    sub: `mock-${role.toLowerCase()}`,
    email,
    role,
    branchId: 'mock-finance',
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    mock: true,
  };
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.mock`;
}

class MockError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockRequest<T>(path: string, method: string, body: unknown): Promise<T> {
  await delay(300); // laisse voir les états de chargement

  if (method === 'POST' && path === '/auth/login') {
    const { email, password } = body as { email: string; password: string };
    const account = MOCK_ACCOUNTS.find((a) => a.email === email.toLowerCase());
    if (!account || password !== MOCK_PASSWORD) throw new MockError(401, 'Email ou mot de passe incorrect.');
    return { access_token: mockToken(account.email, account.role) } as T;
  }

  const clockRoute = path.match(/^\/clocks\/([^/]+)$/);
  if (clockRoute) {
    const userId = clockRoute[1];
    const mine = clocks.filter((c) => c.userId === userId);
    if (method === 'GET') return mine as T;
    if (method === 'POST') {
      const status = mine.at(-1)?.status === 'IN' ? 'OUT' : 'IN';
      const clock = { id: String(clocks.length + 1), userId, status, time: new Date().toISOString() } as const;
      clocks.push(clock);
      return clock as T;
    }
  }

  throw new MockError(404, `Mode démo : la route ${method} ${path} n'est pas simulée.`);
}
