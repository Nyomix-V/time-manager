# Contrat d'API attendu par l'application mobile

L'app est développée avec un faux backend (mode démo, `src/mock/server.ts`) qui suit exactement ce contrat. Quand ces routes existeront dans le backend, il suffira de construire l'app sans le mode démo.

- Toutes les routes, sauf `POST /auth/login`, attendent l'en-tête `Authorization: Bearer <jeton>`.
- Les dates sont en ISO 8601 (`2026-10-07T07:57:00.000Z`).
- Les erreurs suivent le format NestJS : `{ "message": "..." }`. L'app affiche ce message tel quel : **il doit être en français**.
- Les types TypeScript complets sont dans `src/api/types.ts` ; les appels dans `src/api/index.ts`.

Légende : ✅ existe déjà · 🟡 existe, à compléter · 🆕 à créer

## Authentification

| | Route | Corps | Réponse |
|---|---|---|---|
| ✅ | `POST /auth/login` | `{ email, password }` | `{ access_token }` (contenu du jeton : `sub`, `email`, `role`, `branchId`) |
| 🆕 | `POST /auth/password` | `{ currentPassword, newPassword }` | `{ updated: true }`. 400 si le mot de passe actuel est faux ou si le nouveau fait moins de 12 caractères |

## Utilisateurs, équipes, branches

| | Route | Qui | Notes |
|---|---|---|---|
| 🟡 | `GET /users` | manager, directeur, admin | **Tous les salariés de l'entreprise** (les managers voient tout le monde). Ajouter `teamId` et `microsoftLinked` à chaque utilisateur |
| 🟡 | `GET /users/:id` | soi-même, ou manager / directeur / admin | Aujourd'hui, n'importe quel utilisateur connecté peut lire n'importe quelle fiche |
| 🟡 | `PUT /users/:id` | voir « Droits » | Corps : `{ firstName, lastName, email, phone, teamId }`. **Un employé ne doit pas pouvoir se modifier lui-même** (il passe par une demande) |
| ✅ | `DELETE /users/:id` | voir « Droits » | |
| 🆕 | `GET /teams` | tous | `[{ id, name, description, branchId, managerId }]` |
| ✅ | `GET /branches` | tous | `[{ id, name }]` (sans la liste des utilisateurs) |

## Planning d'un salarié 🆕

```json
{ "userId": "…", "workDays": [1, 2, 3, 4, 5], "startMin": 540, "dailyMinutes": 420, "breakMinutes": 45 }
```

`workDays` : 1 = lundi … 7 = dimanche. `startMin` : minutes depuis minuit (540 = 09:00). **La fin de journée n'est pas stockée** : `startMin + dailyMinutes + breakMinutes`.

| | Route | Qui |
|---|---|---|
| 🆕 | `GET /plannings/:userId` | soi-même, ou manager / directeur / admin. Renvoie `null` si aucun planning |
| 🆕 | `PUT /plannings/:userId` | voir « Droits ». Corps : le planning sans `userId` |

## Pointages

| | Route | Notes |
|---|---|---|
| 🟡 | `GET /clocks/:userId?from=&to=` | Ajouter le filtre par dates. Lecture : soi-même, ou manager / directeur / admin |
| 🟡 | `POST /clocks/:userId` | Corps : `{ status }` avec `IN`, `BREAK_START`, `BREAK_END` ou `OUT` (**les pauses sont nouvelles**). Uniquement pour soi-même ; l'admin ne pointe pas (403) |

Enchaînements autorisés dans la journée (sinon 409) :

```
aucun pointage → IN → BREAK_START → BREAK_END → … → OUT (terminé)
```

Pendant une pause, seul `BREAK_END` est possible. Les pauses ne comptent pas dans le temps travaillé.

## Présence en direct 🆕

`GET /presence` (manager, directeur, admin) : une ligne par salarié ayant un planning.

```json
{ "userId": "…", "state": "WORKING", "since": "2026-10-07T07:57:00.000Z", "lateMinutes": 12 }
```

`state` : `NOT_STARTED`, `WORKING`, `ON_BREAK`, `DONE`, `ABSENT` (absence déclarée ce jour) ou `OFF_DAY` (jour non travaillé). `since` : heure du dernier pointage. L'app rafraîchit cet écran chaque minute.

## KPI

🟡 `GET /kpi/report?from=&to=` : la réponse actuelle convient. Ajouter `workedDays` (nombre de jours travaillés sur la période) à chaque ligne : il sert au taux de ponctualité. L'alerte reste `lateAlert = lateDays > 3`. L'app l'affiche sur les 30 derniers jours.

## Absences

```json
{
  "id": "…", "userId": "…", "type": "SICK_LEAVE", "startDate": "…", "endDate": "…",
  "reason": "commentaire libre", "attachmentName": "avis-arret.pdf",
  "status": "PENDING", "createdAt": "…",
  "decidedBy": "…", "decidedByName": "Karim Benali", "decidedAt": "…", "decisionComment": "…"
}
```

`type` 🆕 : `SICK_LEAVE` (arrêt maladie), `MEDICAL` (rendez-vous médical), `LEAVE` (congé), `FORGOTTEN_CLOCK` (oubli de pointage), `OTHER`.
`decidedByName` 🆕 : un employé n'a pas le droit de lire la fiche de son manager, il faut donc renvoyer le nom.

| | Route | Notes |
|---|---|---|
| 🟡 | `POST /absences` | Corps : `{ type, startDate, endDate, reason, attachmentName }`. L'envoi du fichier justificatif reste à définir |
| ✅ | `GET /absences/user/:userId` | Plus récentes en premier. Lecture : soi-même, ou manager / directeur / admin |
| 🆕 | `GET /absences?status=PENDING` | Demandes **que la personne connectée peut traiter** (voir « Droits ») |
| 🟡 | `PATCH /absences/:id/decision` | Corps : `{ status: "APPROVED" \| "REJECTED", comment }`. **`comment` obligatoire en cas de refus** (400). 409 si déjà traitée |

## Demandes de modification ou de suppression du profil 🆕

Un employé ne modifie pas ses informations : il fait une demande, que son responsable valide. **Une seule demande en attente à la fois** (sinon 409).

```json
{
  "id": "…", "userId": "…", "kind": "UPDATE", "field": "phone",
  "currentValue": "+33 6 12 34 56 78", "newValue": "+33 6 98 76 54 32", "reason": null,
  "status": "PENDING", "createdAt": "…",
  "decidedBy": null, "decidedByName": null, "decidedAt": null, "decisionComment": null
}
```

`kind` : `UPDATE` (avec `field` : `firstName`, `lastName`, `email` ou `phone`) ou `DELETE` (avec `reason`).

| Route | Notes |
|---|---|
| `POST /profile-requests` | `{ kind: "UPDATE", field, newValue }` ou `{ kind: "DELETE", reason }`. `currentValue` est rempli par le serveur |
| `GET /profile-requests/user/:userId` | Historique de la personne |
| `GET /profile-requests?status=PENDING` | Demandes que la personne connectée peut traiter |
| `PATCH /profile-requests/:id/decision` | Comme pour les absences. Une fois validée : `UPDATE` applique la nouvelle valeur, `DELETE` supprime le compte (suppression douce) |

## Droits

| Action | Employé | Manager | Directeur | Admin |
|---|---|---|---|---|
| Voir la liste des salariés, la présence, les KPI | ✗ | toute l'entreprise | toute l'entreprise | tout |
| Modifier / supprimer un salarié, son planning | ✗ | salariés **de ses équipes** | salariés et managers **de sa branche** | tous |
| Traiter les demandes (absences, profil) | ✗ | salariés de ses équipes | managers et salariés de sa branche | directeurs (et tous) |
| Pointer | soi | soi | soi | ✗ |

Les demandes d'un employé vont à son manager, celles d'un manager à son directeur, celles d'un directeur à l'admin.

## Calculs d'heures : attention au fuseau horaire

L'app calcule en **heure locale** (Europe/Paris) : une arrivée à 09:12 avec un début prévu à 09:00 fait **12 minutes de retard**. Le backend actuel (`kpi/lateness.ts`, `workingtimes.service.ts`) calcule en **UTC** : en France, presque aucun retard n'est détecté, et les heures proches de minuit sont rattachées au mauvais jour. Les calculs de référence de l'app sont dans `src/domain/time.ts`.
