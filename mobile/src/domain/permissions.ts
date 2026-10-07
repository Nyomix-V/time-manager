// Ce que l'interface propose selon le rôle. Le backend reste seul juge : ces règles servent
// uniquement à ne pas afficher des boutons qui seraient refusés.
import type { Team, User } from '@/api/types';
import type { Session } from '@/auth/session';

/** Équipes dont la personne connectée est responsable (manager) ou qui sont dans sa branche (directeur). */
export function myTeams(session: Session, teams: Team[]) {
  if (session.role === 'MANAGER') return teams.filter((t) => t.managerId === session.userId);
  if (session.role === 'DIRECTEUR') return teams.filter((t) => t.branchId === session.branchId);
  if (session.role === 'ADMIN') return teams;
  return [];
}

/** Peut modifier ou supprimer ce salarié. */
export function canManage(session: Session, target: User, teams: Team[]) {
  if (target.id === session.userId) return false;
  if (session.role === 'ADMIN') return true;
  if (session.role === 'DIRECTEUR') {
    return target.branchId === session.branchId && target.role !== 'ADMIN' && target.role !== 'DIRECTEUR';
  }
  if (session.role === 'MANAGER') return myTeams(session, teams).some((t) => t.id === target.teamId);
  return false;
}
