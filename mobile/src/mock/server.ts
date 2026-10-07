// Faux backend du mode démo : mêmes routes et mêmes règles d'accès que celles attendues de l'API
// (décrites dans mobile/API.md). Utilisé quand EXPO_PUBLIC_MOCK=1.
import type {
  Absence,
  ClockStatus,
  DecisionStatus,
  KpiRow,
  Planning,
  Presence,
  ProfileField,
  ProfileRequest,
  User,
} from '@/api/types';
import {
  coversDay,
  dayKey,
  isWorkDay,
  NEXT_CLOCKS,
  periodStats,
  plannedWeeklyMinutes,
  startOfWeek,
  summarizeDay,
  summarizeDays,
  workState,
} from '@/domain/time';
import {
  absences,
  branches,
  clocks,
  MOCK_ACCOUNTS,
  MOCK_PASSWORD,
  plannings,
  profileRequests,
  teams,
  users,
} from './data';

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

// ---- Jeton ----

// Le contenu du jeton (identifiants, emails) est en ASCII : btoa suffit.
const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Même format que le jeton du backend, marqué "mock" pour être refusé hors du mode démo.
function mockToken(u: User) {
  const payload = { sub: u.id, email: u.email, role: u.role, branchId: u.branchId, exp: Math.floor(Date.now() / 1000) + 30 * 86400, mock: true };
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

// ---- Droits ----

const isSupervisor = (u: User) => u.role === 'MANAGER' || u.role === 'DIRECTEUR' || u.role === 'ADMIN';

/** Qui peut gérer (modifier, supprimer, valider les demandes de) qui. */
function manages(actor: User, target: User) {
  if (actor.id === target.id) return false;
  if (actor.role === 'ADMIN') return true;
  if (actor.role === 'DIRECTEUR') return target.branchId === actor.branchId && target.role !== 'ADMIN' && target.role !== 'DIRECTEUR';
  if (actor.role === 'MANAGER') return teams.some((t) => t.id === target.teamId && t.managerId === actor.id);
  return false;
}

/** Les demandes d'un manager vont à son directeur, celles d'un directeur à l'admin. */
function decides(actor: User, target: User) {
  if (target.role === 'MANAGER') return actor.role === 'DIRECTEUR' ? actor.branchId === target.branchId : actor.role === 'ADMIN';
  if (target.role === 'DIRECTEUR') return actor.role === 'ADMIN';
  return manages(actor, target);
}

// Les managers voient tous les salariés de l'entreprise ; un employé ne voit que lui-même.
function assertCanRead(actor: User, userId: string) {
  if (actor.id !== userId && !isSupervisor(actor)) throw new MockError(403, 'Accès refusé.');
}

function findUser(id: string) {
  const found = users.find((u) => u.id === id);
  if (!found) throw new MockError(404, 'Utilisateur introuvable.');
  return found;
}

const planningOf = (userId: string) => plannings.find((p) => p.userId === userId) ?? null;
const visibleClocks = (userId: string) => clocks.filter((c) => c.userId === userId && new Date(c.time) <= new Date());

// ---- Routes ----

// Paramètres d'URL (?from=…&to=…). URLSearchParams est incomplet sur React Native.
type Query = { get: (name: string) => string | null };
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

const routes: [string, RegExp, Handler][] = [
  ['POST', /^\/auth\/login$/, ({ body }) => {
    const email = String(body?.email ?? '').toLowerCase();
    const account = MOCK_ACCOUNTS.find((a) => a.email === email);
    const target = users.find((u) => u.id === account?.userId || u.email === email);
    if (!target || passwords.get(target.id) !== body?.password) throw new MockError(401, 'Email ou mot de passe incorrect.');
    return { access_token: mockToken(target) };
  }],

  ['POST', /^\/auth\/password$/, ({ actor, body }) => {
    const me = actor();
    if (passwords.get(me.id) !== body?.currentPassword) throw new MockError(400, 'Mot de passe actuel incorrect.');
    if (String(body?.newPassword ?? '').length < 12) throw new MockError(400, 'Le nouveau mot de passe doit faire au moins 12 caractères.');
    passwords.set(me.id, body.newPassword);
    return { updated: true };
  }],

  // ---- Utilisateurs, équipes ----
  ['GET', /^\/users$/, ({ actor }) => {
    if (!isSupervisor(actor())) throw new MockError(403, 'Accès refusé.');
    return users;
  }],
  ['GET', /^\/users\/([^/]+)$/, ({ actor, params }) => {
    assertCanRead(actor(), params[0]);
    return findUser(params[0]);
  }],
  ['PUT', /^\/users\/([^/]+)$/, ({ actor, params, body }) => {
    const target = findUser(params[0]);
    // Un salarié ne modifie pas ses informations lui-même : il passe par une demande.
    if (!manages(actor(), target)) throw new MockError(403, 'Vous ne pouvez pas modifier ce salarié.');
    const { firstName, lastName, email, phone, teamId } = body ?? {};
    Object.assign(target, { firstName, lastName, email, phone, teamId });
    return target;
  }],
  ['DELETE', /^\/users\/([^/]+)$/, ({ actor, params }) => {
    const target = findUser(params[0]);
    if (!manages(actor(), target)) throw new MockError(403, 'Vous ne pouvez pas supprimer ce salarié.');
    users.splice(users.indexOf(target), 1);
    return { deleted: true };
  }],
  ['GET', /^\/teams$/, () => teams],
  ['GET', /^\/branches$/, () => branches],

  // ---- Plannings ----
  ['GET', /^\/plannings\/([^/]+)$/, ({ actor, params }) => {
    assertCanRead(actor(), params[0]);
    return planningOf(params[0]);
  }],
  ['PUT', /^\/plannings\/([^/]+)$/, ({ actor, params, body }) => {
    if (!manages(actor(), findUser(params[0]))) throw new MockError(403, 'Vous ne pouvez pas modifier ce planning.');
    const next: Planning = { userId: params[0], workDays: body.workDays, startMin: body.startMin, dailyMinutes: body.dailyMinutes, breakMinutes: body.breakMinutes };
    const existing = planningOf(params[0]);
    if (existing) Object.assign(existing, next);
    else plannings.push(next);
    return next;
  }],

  // ---- Pointages ----
  ['GET', /^\/clocks\/([^/]+)$/, ({ actor, params, query }) => {
    assertCanRead(actor(), params[0]);
    const from = query.get('from');
    const to = query.get('to');
    return visibleClocks(params[0]).filter((c) => (!from || c.time >= from) && (!to || c.time <= to));
  }],
  ['POST', /^\/clocks\/([^/]+)$/, ({ actor, params, body }) => {
    const me = actor();
    // On ne pointe que pour soi-même, et l'admin ne pointe pas.
    if (me.id !== params[0]) throw new MockError(403, 'Vous ne pouvez pointer que pour vous-même.');
    if (me.role === 'ADMIN') throw new MockError(403, "L'administrateur ne pointe pas.");
    const todayClocks = visibleClocks(me.id).filter((c) => dayKey(new Date(c.time)) === dayKey(new Date()));
    const status = body?.status as ClockStatus;
    if (!NEXT_CLOCKS[workState(todayClocks)].includes(status)) throw new MockError(409, 'Ce pointage n’est pas possible maintenant.');
    const clock = { id: newId('c'), userId: me.id, status, time: new Date().toISOString() };
    clocks.push(clock);
    return clock;
  }],

  // ---- Présence et KPI (manager, directeur, admin) ----
  ['GET', /^\/presence$/, ({ actor }) => {
    if (!isSupervisor(actor())) throw new MockError(403, 'Accès refusé.');
    const now = new Date();
    return users
      .filter((u) => planningOf(u.id))
      .map((u): Presence => {
        const p = planningOf(u.id)!;
        const todayClocks = visibleClocks(u.id).filter((c) => dayKey(new Date(c.time)) === dayKey(now));
        const absent = absences.some((a) => a.userId === u.id && a.status !== 'REJECTED' && a.type !== 'MEDICAL' && a.type !== 'FORGOTTEN_CLOCK' && coversDay(a, now));
        const state = todayClocks.length ? workState(todayClocks) : absent ? 'ABSENT' : isWorkDay(p, now) ? 'NOT_STARTED' : 'OFF_DAY';
        return {
          userId: u.id,
          state,
          since: todayClocks.at(-1)?.time ?? null,
          lateMinutes: todayClocks.length ? summarizeDay(todayClocks, p, now).lateMinutes : 0,
        };
      });
  }],
  ['GET', /^\/kpi\/report$/, ({ actor, query }) => {
    if (!isSupervisor(actor())) throw new MockError(403, 'Accès refusé.');
    const from = query.get('from');
    const to = query.get('to');
    const rows = users
      .filter((u) => planningOf(u.id))
      .map((u): KpiRow => {
        const p = planningOf(u.id)!;
        const range = visibleClocks(u.id).filter((c) => (!from || c.time >= from) && (!to || c.time <= to));
        const days = summarizeDays(range, p);
        const stats = periodStats(days);
        const weeks = new Set(days.map((d) => dayKey(startOfWeek(d.date)))).size;
        return {
          userId: u.id,
          name: `${u.firstName} ${u.lastName}`,
          totalHours: round2(stats.totalMinutes / 60),
          overtimeHours: round2(Math.max(0, stats.totalMinutes - plannedWeeklyMinutes(p) * weeks) / 60),
          avgDailyHours: round2(stats.avgPerDayMinutes / 60),
          lateDays: stats.lateDays,
          lateAlert: stats.lateDays > 3,
          workedDays: stats.workedDays,
        };
      });
    return { from, to, rows };
  }],

  // ---- Absences ----
  ['GET', /^\/absences\/user\/([^/]+)$/, ({ actor, params }) => {
    assertCanRead(actor(), params[0]);
    return absences.filter((a) => a.userId === params[0]).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }],
  ['GET', /^\/absences$/, ({ actor, query }) => {
    const me = actor();
    return absences.filter((a) => (!query.get('status') || a.status === query.get('status')) && decidable(me, a.userId));
  }],
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
      reason: body.reason ?? '',
      attachmentName: body.attachmentName ?? null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      decidedBy: null,
      decidedByName: null,
      decidedAt: null,
      decisionComment: null,
    };
    absences.push(created);
    return created;
  }],
  ['PATCH', /^\/absences\/([^/]+)\/decision$/, ({ actor, params, body }) => {
    const item = absences.find((a) => a.id === params[0]);
    if (!item) throw new MockError(404, 'Demande introuvable.');
    return decide(actor(), item, body);
  }],

  // ---- Demandes de modification / suppression du profil ----
  ['GET', /^\/profile-requests\/user\/([^/]+)$/, ({ actor, params }) => {
    assertCanRead(actor(), params[0]);
    return profileRequests.filter((r) => r.userId === params[0]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }],
  ['GET', /^\/profile-requests$/, ({ actor, query }) => {
    const me = actor();
    return profileRequests.filter((r) => (!query.get('status') || r.status === query.get('status')) && decidable(me, r.userId));
  }],
  ['POST', /^\/profile-requests$/, ({ actor, body }) => {
    const me = actor();
    if (profileRequests.some((r) => r.userId === me.id && r.status === 'PENDING')) {
      throw new MockError(409, 'Une demande est déjà en attente : attendez la réponse de votre manager.');
    }
    const field = (body?.field ?? null) as ProfileField | null;
    if (body?.kind === 'UPDATE' && (!field || !body?.newValue)) throw new MockError(400, 'Information et nouvelle valeur obligatoires.');
    const created: ProfileRequest = {
      id: newId('pr'),
      userId: me.id,
      kind: body?.kind === 'DELETE' ? 'DELETE' : 'UPDATE',
      field,
      currentValue: field ? (me[field] ?? null) : null,
      newValue: body?.newValue ?? null,
      reason: body?.reason ?? null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      decidedBy: null,
      decidedByName: null,
      decidedAt: null,
      decisionComment: null,
    };
    profileRequests.push(created);
    return created;
  }],
  ['PATCH', /^\/profile-requests\/([^/]+)\/decision$/, ({ actor, params, body }) => {
    const item = profileRequests.find((r) => r.id === params[0]);
    if (!item) throw new MockError(404, 'Demande introuvable.');
    const decided = decide(actor(), item, body);
    if (decided.status === 'APPROVED') {
      const target = findUser(item.userId);
      if (item.kind === 'UPDATE' && item.field) target[item.field] = item.newValue ?? '';
      if (item.kind === 'DELETE') users.splice(users.indexOf(target), 1);
    }
    return decided;
  }],
];

function decidable(actor: User, userId: string) {
  const target = users.find((u) => u.id === userId);
  return !!target && decides(actor, target);
}

function decide<T extends { userId: string; status: DecisionStatus; decidedBy: string | null; decidedByName: string | null; decidedAt: string | null; decisionComment: string | null }>(
  actor: User,
  item: T,
  body: { status?: DecisionStatus; comment?: string },
): T {
  if (!decidable(actor, item.userId)) throw new MockError(403, 'Cette demande ne relève pas de vous.');
  if (item.status !== 'PENDING') throw new MockError(409, 'Cette demande a déjà été traitée.');
  if (body?.status !== 'APPROVED' && body?.status !== 'REJECTED') throw new MockError(400, 'Décision invalide.');
  const comment = body.comment?.trim() || null;
  if (body.status === 'REJECTED' && !comment) throw new MockError(400, 'Le motif du refus est obligatoire.');
  Object.assign(item, {
    status: body.status,
    decidedBy: actor.id,
    decidedByName: `${actor.firstName} ${actor.lastName}`,
    decidedAt: new Date().toISOString(),
    decisionComment: comment,
  });
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
