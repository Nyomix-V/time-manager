import { MOCK } from '@/lib/config';

// Rôles renvoyés par le backend (backend/src/entities/enums.ts).
export type Role = 'EMPLOYEE' | 'MANAGER' | 'DIRECTEUR' | 'ADMIN';

export type Session = {
  token: string;
  userId: string;
  email: string;
  role: Role;
  branchId: string | null;
};

// Contenu du JWT signé par le backend (AuthService.sign).
type JwtPayload = { sub: string; email: string; role: Role; branchId?: string | null; exp?: number; mock?: boolean };

// Lit le contenu du jeton sans le vérifier : la vérification de la signature est faite par le backend.
export function sessionFromToken(token: string): Session | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as JwtPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    // Un jeton du mode démo resté en mémoire ne doit jamais servir face au vrai backend.
    if (payload.mock && !MOCK) return null;
    return { token, userId: payload.sub, email: payload.email, role: payload.role, branchId: payload.branchId ?? null };
  } catch {
    return null;
  }
}

// Le manager et le directeur suivent une équipe et valident des demandes.
export const supervises = (role: Role) => role === 'MANAGER' || role === 'DIRECTEUR';

// Tout le monde pointe, sauf l'admin.
export const clocksIn = (role: Role) => role !== 'ADMIN';
