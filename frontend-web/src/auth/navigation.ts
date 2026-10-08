import {
  BarChart3,
  Building2,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
  Timer,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/api/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: 'pendingRequests';
}

export const ROUTES = {
  login: '/connexion',
  forgotPassword: '/mot-de-passe-oublie',
  resetPassword: '/reinitialiser-mot-de-passe', // ?token=
  activate: '/activer-mon-compte', // ?token=
  clock: '/pointage',
  myHours: '/mes-heures',
  absences: '/absences',
  profile: '/profil',
  teamDashboard: '/dashboard-equipe',
  branchDashboard: '/dashboard-branche',
  employees: '/salaries',
  newEmployee: '/salaries/nouveau',
  employee: (id: string) => `/salaries/${id}`,
  teams: '/equipes',
  requests: '/demandes',
  adminDashboard: '/admin',
  adminUsers: '/admin/utilisateurs',
  adminBranches: '/admin/branches',
  adminClocks: '/admin/pointages',
} as const;

const common = {
  clock: { label: 'Pointage', to: ROUTES.clock, icon: Clock },
  hours: { label: 'Mes heures', to: ROUTES.myHours, icon: Timer },
  absences: { label: 'Absences', to: ROUTES.absences, icon: FileText },
  profile: { label: 'Mon profil', to: ROUTES.profile, icon: User },
  employees: { label: 'Salariés', to: ROUTES.employees, icon: Users },
  teams: { label: 'Équipes', to: ROUTES.teams, icon: Building2 },
  requests: { label: 'Demandes à valider', to: ROUTES.requests, icon: CheckSquare, badge: 'pendingRequests' },
} satisfies Record<string, NavItem>;

// Same menus as docs/maquettes/assets/app.js (ROLES).
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  EMPLOYEE: [common.clock, common.hours, common.absences, common.profile],
  MANAGER: [
    common.clock,
    common.hours,
    { label: 'Dashboard équipe', to: ROUTES.teamDashboard, icon: BarChart3 },
    common.employees,
    common.teams,
    common.requests,
    common.absences,
    common.profile,
  ],
  DIRECTEUR: [
    common.clock,
    common.hours,
    { label: 'Dashboard branche', to: ROUTES.branchDashboard, icon: BarChart3 },
    common.employees,
    common.teams,
    common.requests,
    common.absences,
    common.profile,
  ],
  ADMIN: [
    { label: 'Dashboard global', to: ROUTES.adminDashboard, icon: LayoutDashboard },
    { label: 'Utilisateurs', to: ROUTES.adminUsers, icon: Users },
    { label: 'Branches & équipes', to: ROUTES.adminBranches, icon: Building2 },
    { label: 'Pointages', to: ROUTES.adminClocks, icon: Clock },
    common.profile,
  ],
};

export function homeFor(role: Role): string {
  return role === 'ADMIN' ? ROUTES.adminDashboard : ROUTES.clock;
}
