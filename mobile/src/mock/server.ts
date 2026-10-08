// Faux backend du mode démo (EXPO_PUBLIC_MOCK=1) : mêmes routes, mêmes formats et mêmes règles que le
// backend NestJS (on pointe pour soi, on ne lit et ne décide que dans son périmètre, motif obligatoire
// pour un refus, journées et retards à l'heure locale, absence validée = retard excusé).
import type { Absence, AccountRequest, ClockType, KpiRow, PersonRef, Requester, RequestStatus, User } from '@/api/types';
import { canManage } from '@/domain/permissions';
import { excusedDays, isSameDay, periodStats, planningOf, summarizeDays } from '@/domain/time';
import { absences, accountRequests, branches, clocks, MOCK_ACCOUNTS, MOCK_PASSWORD, teams, users } from './data';

export class MockError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const passwords = new Map<string, string>(users.map((u) => [u.id, MOCK_PASSWORD]));
let nextId = 1;
const newId = (prefix: string) => `${prefix}-new-${nextId++}`;

// ---- Jeton : même contenu que celui du backend, marqué "mock" pour être refusé hors du mode démo ----

// Le contenu du jeton (identifiants, emails) est en ASCII : btoa suffit.
const base64Url = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function mockToken(u: User) {
  const payload = { sub: u.id, email: u.email, role: u.role, branchId: u.branchId ?? null, exp: Math.floor(Date.now() / 1000) + 30 * 86400, mock: true };
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.mock`;
}

function actorFrom(token: string | null): User {
  try {
    const payload = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const found = users.find((u) => u.id === payload.sub);
    if (found) return found;
  } catch {
    // jeton absent ou illisible
  }
  throw new MockError(401, 'Session expirée, reconnectez-vous.');
}

// ---- Droits (backend/src/auth/scope.ts) ----

const SUPERVISORS: User['role'][] = ['MANAGER', 'DIRECTEUR', 'ADMIN'];
const requireSupervisor = (actor: User) => {
  if (!SUPERVISORS.includes(actor.role)) throw new MockError(403, 'Accès refusé.');
};
const asSession = (u: User) => ({ token: '', userId: u.id, email: u.email, role: u.role, branchId: u.branchId ?? null });
const manages = (actor: User, target: User) => canManage(asSession(actor), target);

/** assertCanReadUser : soi-même, sa branche (manager, directeur), tout (admin). */
function assertCanRead(actor: User, target: User) {
  if (actor.role === 'ADMIN' || actor.id === target.id) return;
  if ((actor.role === 'MANAGER' || actor.role === 'DIRECTEUR') && actor.branchId && actor.branchId === target.branchId) return;
  throw new MockError(403, 'Vous ne pouvez pas consulter cette personne.');
}

function findUser(id: string) {
  const found = users.find((u) => u.id === id);
  if (!found) throw new MockError(404, 'Utilisateur introuvable.');
  return found;
}

const inBranchScope = (actor: User) => (u: User) => actor.role === 'ADMIN' || u.branchId === actor.branchId;

// Relations renvoyées par le backend (relations: { team, branch } et { manager, members }).
const withRelations = (u: User): User => ({
  ...u,
  team: teams.find((t) => t.id === u.teamId) ?? null,
  branch: branches.find((b) => b.id === u.branchId) ?? null,
});
// Demandes : la personne qui demande (listes en attente) et celle qui a décidé (historiques), réduites.
const personRef = (u: User): PersonRef => ({ id: u.id, firstName: u.firstName, lastName: u.lastName });
const withRequester = <T extends { userId: string }>(item: T) => {
  const u = users.find((x) => x.id === item.userId);
  const user: Requester | null = u ? { ...personRef(u), phone: u.phone ?? null, teamId: u.teamId ?? null, role: u.role } : null;
  return { ...item, user };
};
const withDecider = <T extends { decidedById?: string | null }>(item: T) => {
  const u = users.find((x) => x.id === item.decidedById);
  return { ...item, decidedBy: u ? personRef(u) : null };
};

const visibleClocks = (userId: string) => clocks.filter((c) => c.userId === userId && new Date(c.time) <= new Date());
/** Dernier pointage d'AUJOURD'HUI : chaque journée repart de zéro (un départ oublié la veille ne bloque pas). */
const lastToday = (userId: string) => visibleClocks(userId).filter((c) => isSameDay(new Date(c.time), new Date())).at(-1);

// ---- Routes ----

type Query = { get: (name: string) => string | null };
// URLSearchParams est incomplet sur React Native.
const parseQuery = (search: string): Query => {
  const values = new Map(
    search
      .split('&')
      .filter(Boolean)
      .map((pair) => pair.split('=').map(decodeURIComponent) as [string, string]),
  );
  return { get: (name) => values.get(name) ?? null };
};

type Handler = (ctx: { actor: () => User; params: string[]; query: Query; body: any }) => unknown;

// Politique de mot de passe du backend (auth.controller.ts).
const STRONG = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

// Enchaînements autorisés : ClocksService.allowed (selon le dernier pointage).
function allowed(last: ClockType | null, next: ClockType) {
  if (next === 'IN') return last === null || last === 'OUT';
  if (next === 'BREAK_START') return last === 'IN' || last === 'BREAK_END';
  if (next === 'BREAK_END') return last === 'BREAK_START';
  return last === 'IN' || last === 'BREAK_END';
}

const PUNCH_ROUTES: Record<string, ClockType> = { arrive: 'IN', 'break/start': 'BREAK_START', 'break/end': 'BREAK_END', depart: 'OUT' };

const routes: [string, RegExp, Handler][] = [
  // ---- Authentification ----
  ['POST', /^\/auth\/login$/, ({ body }) => {
    const email = String(body?.email ?? '').toLowerCase();
    const account = MOCK_ACCOUNTS.find((a) => a.email === email);
    const target = users.find((u) => u.id === account?.userId || u.email === email);
    if (!target || passwords.get(target.id) !== body?.password) throw new MockError(401, 'Email ou mot de passe incorrect.');
    if (target.status !== 'ACTIVE') throw new MockError(401, 'Compte non activé : utilisez le lien reçu par email.');
    return { access_token: mockToken(target), user: { id: target.id, email: target.email, role: target.role, branchId: target.branchId ?? null } };
  }],
  ['POST', /^\/auth\/change-password$/, ({ actor, body }) => {
    const me = actor();
    if (!STRONG.test(String(body?.newPassword ?? ''))) {
      throw new MockError(400, 'Mot de passe trop faible : 12 caractères, une majuscule, un chiffre et un caractère spécial.');
    }
    if (passwords.get(me.id) !== body?.currentPassword) throw new MockError(401, 'Mot de passe actuel incorrect.');
    passwords.set(me.id, body.newPassword);
    return { changed: true };
  }],

  // ---- Utilisateurs, équipes ----
  ['GET', /^\/users$/, ({ actor, query }) => {
    const me = actor();
    requireSupervisor(me);
    const teamId = query.get('teamId');
    return users.filter(inBranchScope(me)).filter((u) => !teamId || u.teamId === teamId).map(withRelations);
  }],
  ['GET', /^\/users\/([^/]+)$/, ({ actor, params }) => {
    const target = findUser(params[0]);
    assertCanRead(actor(), target);
    return withRelations(target);
  }],
  ['PUT', /^\/users\/([^/]+)$/, ({ actor, params, body }) => {
    const me = actor();
    requireSupervisor(me);
    const target = findUser(params[0]);
    if (!manages(me, target)) throw new MockError(403, 'Vous ne pouvez pas gérer cette personne.');
    const fields = ['firstName', 'lastName', 'email', 'phone', 'teamId', 'workingDays', 'expectedStartMin', 'workMinutesPerDay', 'breakMinutes'] as const;
    for (const field of fields) if (body?.[field] !== undefined) (target as any)[field] = body[field];
    return withRelations(target);
  }],
  ['DELETE', /^\/users\/([^/]+)$/, ({ actor, params }) => {
    const me = actor();
    requireSupervisor(me);
    const target = findUser(params[0]);
    if (!manages(me, target)) throw new MockError(403, 'Vous ne pouvez pas gérer cette personne.');
    users.splice(users.indexOf(target), 1); // suppression douce côté backend : la personne disparaît des listes
    return { deleted: true };
  }],
  ['GET', /^\/teams$/, ({ actor }) => {
    const me = actor();
    return teams
      .filter((t) => me.role === 'ADMIN' || t.branchId === me.branchId)
      .map((t) => ({ ...t, manager: users.find((u) => u.id === t.managerId) ?? null, members: users.filter((u) => u.teamId === t.id) }));
  }],

  // ---- Pointages ----
  ['POST', /^\/clocks\/([^/]+)\/(arrive|break\/start|break\/end|depart)$/, ({ actor, params }) => {
    const me = actor();
    // On ne pointe que pour soi-même.
    if (me.id !== params[0]) throw new MockError(403, 'Vous ne pouvez pointer que pour vous-même.');
    if (me.role === 'ADMIN') throw new MockError(400, "L'administrateur ne pointe pas.");
    const type = PUNCH_ROUTES[params[1]];
    if (!allowed(lastToday(me.id)?.type ?? null, type)) throw new MockError(400, 'Ce pointage n’est pas possible maintenant.');
    const clock = { id: newId('c'), userId: me.id, type, time: new Date().toISOString() };
    clocks.push(clock);
    return clock;
  }],
  ['GET', /^\/clocks\/([^/]+)\/status$/, ({ actor, params }) => {
    assertCanRead(actor(), findUser(params[0]));
    const today = lastToday(params[0]);
    const state = today?.type === 'IN' || today?.type === 'BREAK_END' ? 'WORKING' : today?.type === 'BREAK_START' ? 'ON_BREAK' : 'OUT';
    // `since` garde le dernier pointage, même d'un jour précédent.
    return { state, since: (today ?? visibleClocks(params[0]).at(-1))?.time ?? null };
  }],
  ['GET', /^\/clocks\/([^/]+)$/, ({ actor, params, query }) => {
    assertCanRead(actor(), findUser(params[0]));
    const from = query.get('from');
    const to = query.get('to');
    return visibleClocks(params[0]).filter((c) => (!from || c.time >= from) && (!to || c.time <= to));
  }],

  // ---- KPI (manager, directeur, admin) ----
  ['GET', /^\/kpi\/report$/, ({ actor, query }) => {
    const me = actor();
    requireSupervisor(me);
    const from = query.get('from');
    const to = query.get('to');
    const teamId = query.get('teamId');
    const rows = users
      .filter(inBranchScope(me))
      .filter((u) => u.role !== 'ADMIN' && (!teamId || u.teamId === teamId))
      .map((u): KpiRow => {
        const range = visibleClocks(u.id).filter((c) => (!from || c.time >= from) && (!to || c.time <= to));
        const planning = planningOf(u);
        const excused = excusedDays(absences.filter((a) => a.userId === u.id));
        const stats = periodStats(summarizeDays(range, planning), { planning, excused });
        const weeks = Math.max(1, stats.workedDays / Math.max(1, planning.workDays.length));
        const totalHours = stats.totalMinutes / 60;
        return {
          userId: u.id,
          name: `${u.firstName} ${u.lastName}`,
          branchId: u.branchId ?? null,
          teamId: u.teamId ?? null,
          totalHours: round2(totalHours),
          avgDailyHours: round2(stats.avgPerDayMinutes / 60),
          overtimeHours: round2(Math.max(0, totalHours - 35 * weeks)),
          breakMinutes: Math.round(stats.breakMinutes),
          workedDays: stats.workedDays,
          weeklyHours: round2(stats.avgPerWeekMinutes / 60),
          lateDays: stats.lateDays,
          lateAlert: stats.lateDays > 3,
        };
      });
    // Même résumé que KpiService.report : moyenne des personnes qui ont travaillé, part des jours à l'heure.
    const active = rows.filter((r) => r.workedDays > 0);
    const workedDays = rows.reduce((s, r) => s + r.workedDays, 0);
    const lateDays = rows.reduce((s, r) => s + r.lateDays, 0);
    const summary = {
      people: rows.length,
      avgWeeklyHours: round2(active.reduce((s, r) => s + r.weeklyHours, 0) / Math.max(1, active.length)),
      punctualityPct: workedDays === 0 ? 100 : Math.round((1 - lateDays / workedDays) * 100),
      alerts: rows.filter((r) => r.lateAlert).length,
    };
    return { from, to, teamId, summary, rows };
  }],

  // ---- Absences ----
  ['POST', /^\/absences$/, ({ actor, body }) => {
    const me = actor();
    if (!body?.type || !body?.startDate || !body?.endDate) throw new MockError(400, 'Motif et dates obligatoires.');
    if (body.endDate < body.startDate) throw new MockError(400, 'La date de fin est avant la date de début.');
    const created: Absence = {
      id: newId('ab'),
      userId: me.id,
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      comment: body.comment ?? null,
      attachmentPath: body.attachmentPath ?? null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      decidedById: null,
      decidedAt: null,
      decisionComment: null,
    };
    absences.push(created);
    return created;
  }],
  ['GET', /^\/absences\/pending$/, ({ actor }) => {
    const me = actor();
    requireSupervisor(me);
    return absences.filter((a) => a.status === 'PENDING' && decidable(me, a.userId)).map(withRequester);
  }],
  ['GET', /^\/absences\/user\/([^/]+)$/, ({ actor, params }) => {
    assertCanRead(actor(), findUser(params[0]));
    return absences
      .filter((a) => a.userId === params[0])
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(withDecider);
  }],
  ['PATCH', /^\/absences\/([^/]+)\/decision$/, ({ actor, params, body }) => {
    const item = absences.find((a) => a.id === params[0]);
    if (!item) throw new MockError(404, 'Demande introuvable.');
    return decide(actor(), item, body);
  }],

  // ---- Demandes de compte (modification d'information, suppression) ----
  ['POST', /^\/account-requests$/, ({ actor, body }) => {
    const me = actor();
    // Une seule demande en attente à la fois.
    if (accountRequests.some((r) => r.userId === me.id && r.status === 'PENDING')) {
      throw new MockError(400, 'Vous avez déjà une demande en attente.');
    }
    if (body?.type === 'INFO_CHANGE' && (!['phone', 'firstName', 'lastName'].includes(body?.field) || !body?.newValue)) {
      throw new MockError(400, 'Demande de modification invalide.');
    }
    const created: AccountRequest = {
      id: newId('ar'),
      userId: me.id,
      type: body?.type === 'DELETION' ? 'DELETION' : 'INFO_CHANGE',
      field: body?.field ?? null,
      newValue: body?.newValue ?? null,
      reason: body?.reason ?? null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      decidedById: null,
      decidedAt: null,
      decisionComment: null,
    };
    accountRequests.push(created);
    return created;
  }],
  ['GET', /^\/account-requests\/pending$/, ({ actor }) => {
    const me = actor();
    requireSupervisor(me);
    return accountRequests.filter((r) => r.status === 'PENDING' && decidable(me, r.userId)).map(withRequester);
  }],
  ['GET', /^\/account-requests\/user\/([^/]+)$/, ({ actor, params }) => {
    assertCanRead(actor(), findUser(params[0]));
    return accountRequests
      .filter((r) => r.userId === params[0])
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(withDecider);
  }],
  ['PATCH', /^\/account-requests\/([^/]+)\/decision$/, ({ actor, params, body }) => {
    const item = accountRequests.find((r) => r.id === params[0]);
    if (!item) throw new MockError(404, 'Demande introuvable.');
    const result = decide(actor(), item, body);
    if (result.status === 'APPROVED') {
      const target = findUser(item.userId);
      if (item.type === 'INFO_CHANGE' && item.field) target[item.field] = item.newValue ?? '';
      if (item.type === 'DELETION') users.splice(users.indexOf(target), 1);
    }
    return result;
  }],
];

function decidable(actor: User, userId: string) {
  const target = users.find((u) => u.id === userId);
  return !!target && manages(actor, target);
}

function decide<T extends { userId: string; status: RequestStatus; decidedById?: string | null; decidedAt?: string | null; decisionComment?: string | null }>(
  actor: User,
  item: T,
  body: { status?: RequestStatus; decisionComment?: string },
): T {
  requireSupervisor(actor);
  if (!decidable(actor, item.userId)) throw new MockError(403, 'Cette demande ne relève pas de vous.');
  if (item.status !== 'PENDING') throw new MockError(400, 'Cette demande a déjà été traitée.');
  if (body?.status !== 'APPROVED' && body?.status !== 'REJECTED') throw new MockError(400, 'Décision invalide.');
  const comment = body.decisionComment?.trim() || null;
  if (body.status === 'REJECTED' && !comment) throw new MockError(400, 'Le motif du refus est obligatoire.');
  Object.assign(item, { status: body.status, decidedById: actor.id, decidedAt: new Date().toISOString(), decisionComment: comment });
  return item;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockRequest<T>(path: string, method: string, body: unknown, token: string | null): Promise<T> {
  await delay(250); // laisse voir les états de chargement
  const [pathname, search = ''] = path.split('?');
  for (const [routeMethod, pattern, handler] of routes) {
    const match = routeMethod === method ? pathname.match(pattern) : null;
    if (!match) continue;
    const result = handler({ actor: () => actorFrom(token), params: match.slice(1), query: parseQuery(search), body });
    // Copie : l'écran ne doit jamais modifier les données du faux backend par erreur.
    return JSON.parse(JSON.stringify(result ?? null)) as T;
  }
  throw new MockError(404, `Mode démo : la route ${method} ${pathname} n'est pas simulée.`);
}
