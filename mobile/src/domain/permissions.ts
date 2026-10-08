// Ce que l'interface propose selon le rôle : mêmes règles que le backend (backend/src/auth/scope.ts).
// Le backend reste seul juge ; ces règles servent seulement à ne pas afficher des boutons qui seraient refusés.
import type { User } from '@/api/types';
import type { Role, Session } from '@/auth/session';

/** Peut modifier, supprimer ce salarié et traiter ses demandes (assertCanManageUser). */
export function canManage(session: Session, target: Pick<User, 'id' | 'role' | 'branchId'>) {
  if (target.id === session.userId) return false;
  if (session.role === 'ADMIN') return true;
  const sameBranch = !!session.branchId && session.branchId === target.branchId;
  if (session.role === 'DIRECTEUR') return sameBranch && target.role !== 'ADMIN';
  if (session.role === 'MANAGER') return sameBranch && target.role === 'EMPLOYEE';
  return false;
}

/** Rôles qu'on peut inscrire (POST /users), comme sur le site : le directeur crée aussi des managers. */
export function creatableRoles(role: Role): Role[] {
  if (role === 'ADMIN') return ['EMPLOYEE', 'MANAGER', 'DIRECTEUR', 'ADMIN'];
  if (role === 'DIRECTEUR') return ['EMPLOYEE', 'MANAGER'];
  if (role === 'MANAGER') return ['EMPLOYEE'];
  return [];
}

/** Créer, modifier, supprimer les équipes de sa branche (POST/PUT/DELETE /teams). */
export const managesTeams = (role: Role) => role === 'MANAGER' || role === 'DIRECTEUR' || role === 'ADMIN';
