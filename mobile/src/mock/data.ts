// Données du mode démo : les personnes et équipes des maquettes, avec deux mois d'historique.
// L'historique est généré de façon déterministe (même résultat à chaque lancement).
// Tout est en mémoire : les modifications disparaissent au redémarrage de l'app.
import type { Absence, Branch, Clock, ClockStatus, Planning, ProfileRequest, Team, User } from '@/api/types';
import { addDays, coversDay, dayKey, isoWeekday, isSameDay, startOfDay } from '@/domain/time';

export const MOCK_PASSWORD = 'demo1234';

export const MOCK_ACCOUNTS = [
  { email: 'employe@demo.fr', userId: 'u-lea', label: 'Employé' },
  { email: 'manager@demo.fr', userId: 'u-karim', label: 'Manager' },
  { email: 'directeur@demo.fr', userId: 'u-claire', label: 'Directeur' },
  { email: 'admin@demo.fr', userId: 'u-sophie', label: 'Admin' },
] as const;

const DEMO_USER_IDS: string[] = MOCK_ACCOUNTS.map((a) => a.userId);

export const branches: Branch[] = [
  { id: 'br-finance', name: 'Finance' },
  { id: 'br-it', name: 'IT' },
];

export const teams: Team[] = [
  { id: 'tm-compta', name: 'Comptabilité', description: 'Tenue des comptes et clôtures mensuelles.', branchId: 'br-finance', managerId: 'u-karim' },
  { id: 'tm-cdg', name: 'Contrôle de gestion', description: 'Budgets et reporting mensuel.', branchId: 'br-finance', managerId: 'u-karim' },
  { id: 'tm-treso', name: 'Trésorerie', description: 'Flux de trésorerie et relations bancaires.', branchId: 'br-finance', managerId: 'u-nadia' },
  { id: 'tm-infra', name: 'Infrastructure', description: 'Serveurs, réseau et postes de travail.', branchId: 'br-it', managerId: 'u-mehdi' },
];

const user = (
  id: string,
  firstName: string,
  lastName: string,
  role: User['role'],
  branchId: string | null,
  teamId: string | null,
  phone: string | null,
  microsoftLinked = true,
): User => ({
  id,
  firstName,
  lastName,
  email: `${firstName}.${lastName}@trinity-market.com`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''),
  phone,
  role,
  branchId,
  teamId,
  microsoftLinked,
});

export const users: User[] = [
  user('u-lea', 'Léa', 'Martin', 'EMPLOYEE', 'br-finance', 'tm-compta', '+33 6 12 34 56 78'),
  user('u-karim', 'Karim', 'Benali', 'MANAGER', 'br-finance', null, '+33 6 41 22 90 17'),
  user('u-claire', 'Claire', 'Fontaine', 'DIRECTEUR', 'br-finance', null, '+33 6 70 18 33 52'),
  user('u-sophie', 'Sophie', 'Durand', 'ADMIN', null, null, '+33 6 55 02 44 81'),
  user('u-thomas', 'Thomas', 'Petit', 'EMPLOYEE', 'br-finance', 'tm-cdg', '+33 6 22 41 87 03', false),
  user('u-ines', 'Inès', 'Moreau', 'EMPLOYEE', 'br-finance', 'tm-compta', '+33 6 31 75 20 64'),
  user('u-sarah', 'Sarah', 'Roux', 'EMPLOYEE', 'br-finance', 'tm-compta', '+33 6 84 13 57 29'),
  user('u-hugo', 'Hugo', 'Garcia', 'EMPLOYEE', 'br-finance', 'tm-cdg', '+33 6 19 66 38 40', false),
  user('u-nadia', 'Nadia', 'Haddad', 'MANAGER', 'br-finance', null, '+33 6 27 90 14 58'),
  user('u-lucas', 'Lucas', 'Bernard', 'EMPLOYEE', 'br-finance', 'tm-treso', '+33 6 48 52 71 36'),
  user('u-chloe', 'Chloé', 'Laurent', 'EMPLOYEE', 'br-finance', 'tm-treso', '+33 6 93 07 25 11'),
  user('u-nathan', 'Nathan', 'Faure', 'EMPLOYEE', 'br-finance', 'tm-treso', '+33 6 60 34 82 95'),
  user('u-mehdi', 'Mehdi', 'Naceri', 'MANAGER', 'br-it', null, '+33 6 16 49 03 72'),
  user('u-emma', 'Emma', 'Girard', 'EMPLOYEE', 'br-it', 'tm-infra', '+33 6 35 81 26 47'),
  user('u-julien', 'Julien', 'Dupont', 'EMPLOYEE', 'br-it', null, null, false),
];

// Lundi → vendredi, 09:00, 7 h de travail, 45 min de pause, sauf exceptions.
const planning = (userId: string, overrides: Partial<Planning> = {}): Planning => ({
  userId,
  workDays: [1, 2, 3, 4, 5],
  startMin: 9 * 60,
  dailyMinutes: 7 * 60,
  breakMinutes: 45,
  ...overrides,
});

// L'admin ne pointe pas : il n'a pas de planning.
export const plannings: Planning[] = users
  .filter((u) => u.role !== 'ADMIN')
  .map((u) =>
    u.id === 'u-sarah'
      ? planning(u.id, { workDays: [1, 2, 3, 4], startMin: 8 * 60 + 30, dailyMinutes: 6 * 60, breakMinutes: 30 })
      : u.id === 'u-chloe'
        ? planning(u.id, { startMin: 10 * 60 })
        : planning(u.id),
  );

// ---- Générateur pseudo-aléatoire déterministe ----

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function random(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rnd: () => number, min: number, max: number) => Math.round(min + rnd() * (max - min));

// ---- Absences et demandes ----

const now = new Date();
const today = startOfDay(now);
const iso = (d: Date) => d.toISOString();
const at = (d: Date, hours: number, minutes = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);

const absence = (a: Partial<Absence> & Pick<Absence, 'id' | 'userId' | 'type' | 'startDate' | 'endDate'>): Absence => ({
  reason: '',
  attachmentName: null,
  status: 'PENDING',
  createdAt: a.startDate,
  decidedBy: null,
  decidedByName: null,
  decidedAt: null,
  decisionComment: null,
  ...a,
});

export const absences: Absence[] = [
  // Historique de Léa (compte démo employé)
  absence({ id: 'ab-1', userId: 'u-lea', type: 'MEDICAL', startDate: iso(at(addDays(today, -13), 9)), endDate: iso(at(addDays(today, -13), 12)), attachmentName: 'convocation.jpg', status: 'APPROVED', createdAt: iso(addDays(today, -18)), decidedBy: 'u-karim', decidedByName: 'Karim Benali', decidedAt: iso(addDays(today, -17)), decisionComment: 'OK, bon courage pour le rendez-vous.' }),
  absence({ id: 'ab-2', userId: 'u-lea', type: 'FORGOTTEN_CLOCK', startDate: iso(at(addDays(today, -25), 9)), endDate: iso(at(addDays(today, -25), 17)), reason: 'Départ à 16:50, oublié de pointer.', status: 'APPROVED', createdAt: iso(addDays(today, -25)), decidedBy: 'u-karim', decidedByName: 'Karim Benali', decidedAt: iso(addDays(today, -24)), decisionComment: 'Départ corrigé à 16:50.' }),
  absence({ id: 'ab-3', userId: 'u-lea', type: 'LEAVE', startDate: iso(addDays(today, -50)), endDate: iso(addDays(today, -46)), status: 'APPROVED', createdAt: iso(addDays(today, -80)), decidedBy: 'u-karim', decidedByName: 'Karim Benali', decidedAt: iso(addDays(today, -79)), decisionComment: 'Validé, bonnes vacances !' }),
  absence({ id: 'ab-4', userId: 'u-lea', type: 'OTHER', startDate: iso(addDays(today, -95)), endDate: iso(addDays(today, -95)), reason: 'Rendez-vous administratif.', status: 'REJECTED', createdAt: iso(addDays(today, -97)), decidedBy: 'u-karim', decidedByName: 'Karim Benali', decidedAt: iso(addDays(today, -96)), decisionComment: 'Merci de joindre la convocation.' }),
  absence({ id: 'ab-5', userId: 'u-lea', type: 'LEAVE', startDate: iso(addDays(today, -420)), endDate: iso(addDays(today, -410)), status: 'APPROVED', createdAt: iso(addDays(today, -450)), decidedBy: 'u-karim', decidedByName: 'Karim Benali', decidedAt: iso(addDays(today, -449)), decisionComment: null }),
  // Demandes en attente côté managers
  absence({ id: 'ab-6', userId: 'u-lucas', type: 'SICK_LEAVE', startDate: iso(today), endDate: iso(addDays(today, 2)), attachmentName: 'avis-arret.pdf', createdAt: iso(at(today, 8, 12)) }),
  absence({ id: 'ab-7', userId: 'u-thomas', type: 'FORGOTTEN_CLOCK', startDate: iso(at(addDays(today, -3), 9)), endDate: iso(at(addDays(today, -3), 17)), reason: 'Départ à 16:47, badge oublié.', createdAt: iso(addDays(today, -2)) }),
  absence({ id: 'ab-8', userId: 'u-ines', type: 'MEDICAL', startDate: iso(at(addDays(today, 2), 9)), endDate: iso(at(addDays(today, 2), 12)), attachmentName: 'convocation.jpg', createdAt: iso(addDays(today, -1)) }),
  absence({ id: 'ab-9', userId: 'u-hugo', type: 'LEAVE', startDate: iso(addDays(today, -30)), endDate: iso(addDays(today, -28)), status: 'APPROVED', createdAt: iso(addDays(today, -60)), decidedBy: 'u-karim', decidedByName: 'Karim Benali', decidedAt: iso(addDays(today, -59)), decisionComment: null }),
];

export const profileRequests: ProfileRequest[] = [
  { id: 'pr-1', userId: 'u-nathan', kind: 'UPDATE', field: 'phone', currentValue: '+33 6 60 34 82 95', newValue: '+33 7 81 22 45 09', reason: null, status: 'PENDING', createdAt: iso(addDays(today, -2)), decidedBy: null, decidedByName: null, decidedAt: null, decisionComment: null },
  { id: 'pr-2', userId: 'u-sarah', kind: 'DELETE', field: null, currentValue: null, newValue: null, reason: "Départ de l'entreprise", status: 'PENDING', createdAt: iso(addDays(today, -6)), decidedBy: null, decidedByName: null, decidedAt: null, decisionComment: null },
];

// ---- Pointages ----

// Probabilité d'arriver en retard (Thomas et Hugo déclenchent l'alerte de retards).
const LATE_RATE: Record<string, number> = { 'u-thomas': 0.3, 'u-hugo': 0.4 };

function generateDay(p: Planning, date: Date): { status: ClockStatus; time: Date }[] {
  const rnd = random(`${p.userId}-${dayKey(date)}`);
  const late = rnd() < (LATE_RATE[p.userId] ?? 0.04);
  const arrivalMin = p.startMin + (late ? between(rnd, 6, 28) : -between(rnd, 2, 14));
  const breakStartMin = Math.max(arrivalMin + 150, 12 * 60 + 30 + between(rnd, -20, 25));
  const breakMinutes = p.breakMinutes + between(rnd, -8, 12);
  const breakEndMin = breakStartMin + breakMinutes;
  const departureMin = arrivalMin + p.dailyMinutes + breakMinutes + between(rnd, -15, 25);
  return [
    { status: 'IN', time: at(date, 0, arrivalMin) },
    { status: 'BREAK_START', time: at(date, 0, breakStartMin) },
    { status: 'BREAK_END', time: at(date, 0, breakEndMin) },
    { status: 'OUT', time: at(date, 0, departureMin) },
  ];
}

// Pointages de toute la journée, y compris ceux d'aujourd'hui encore à venir :
// le faux backend ne renvoie que ceux dont l'heure est passée, donc l'écran Équipe évolue au fil de la journée.
export const clocks: Clock[] = [];

for (const p of plannings) {
  for (let offset = -60; offset <= 0; offset++) {
    const date = addDays(today, offset);
    if (!p.workDays.includes(isoWeekday(date))) continue;
    // Les comptes démo commencent la journée sans pointage, pour pouvoir pointer soi-même.
    if (offset === 0 && DEMO_USER_IDS.includes(p.userId)) continue;
    // Pas de pointage un jour d'absence (sauf oubli de pointage, où le salarié était bien là).
    const away = absences.some(
      (a) => a.userId === p.userId && a.status !== 'REJECTED' && a.type !== 'FORGOTTEN_CLOCK' && a.type !== 'MEDICAL' && coversDay(a, date),
    );
    if (away) continue;

    let events = generateDay(p, date);
    // Thomas a oublié de pointer son départ il y a 3 jours (sa demande attend la validation du manager).
    if (p.userId === 'u-thomas' && offset === -3) events = events.filter((e) => e.status !== 'OUT');
    // Inès est en pause au moment où l'app démarre.
    if (p.userId === 'u-ines' && isSameDay(date, now)) {
      const breakStart = new Date(now.getTime() - 12 * 60_000);
      if (breakStart > events[0].time) {
        events = [
          events[0],
          { status: 'BREAK_START', time: breakStart },
          { status: 'BREAK_END', time: new Date(breakStart.getTime() + 45 * 60_000) },
          { status: 'OUT', time: new Date(breakStart.getTime() + 4 * 3600_000) },
        ];
      }
    }
    events.forEach((e, i) => clocks.push({ id: `c-${p.userId}-${dayKey(date)}-${i}`, userId: p.userId, status: e.status, time: iso(e.time) }));
  }
}
