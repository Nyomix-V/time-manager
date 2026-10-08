# API utilisée par l'application mobile

L'app appelle le backend NestJS du dépôt (`backend/`). Toutes les routes sont dans `src/api/index.ts`, les formats dans `src/api/types.ts` (copie des entités de `backend/src/entities`). Le mode démo (`src/mock/server.ts`) répond sur **les mêmes routes avec les mêmes formats**.

## Routes utilisées

| Écran | Routes |
|---|---|
| Connexion | `POST /auth/login` |
| Pointage | `GET /users/:id` (planning), `GET /clocks/:id`, `POST /clocks/:id/arrive` · `break/start` · `break/end` · `depart` |
| Mes heures | `GET /users/:id`, `GET /clocks/:id`, `GET /absences/user/:id` |
| Absences | `POST /absences`, `GET /absences/user/:id` |
| Profil | `GET /users/:id`, `GET /account-requests/user/:id`, `POST /account-requests`, `POST /auth/change-password` |
| Équipe | `GET /users`, `GET /teams`, `GET /kpi/report?from&to&teamId`, `GET /clocks/:id/status` (une fois par salarié) |
| Fiche salarié | `GET /users/:id`, `GET /clocks/:id`, `GET /absences/user/:id`, `GET /teams`, `PUT /users/:id`, `DELETE /users/:id` |
| Demandes | `GET /absences/pending`, `GET /account-requests/pending`, `PATCH /absences/:id/decision`, `PATCH /account-requests/:id/decision` |

Vérifié le 8 octobre contre le backend de `main` (script de contrat) : toutes ces routes répondent au format attendu.

## Ce qui reste à faire dans le backend

### Sécurité (le sujet exige des routes sécurisées)

1. **Pointages** : `POST /clocks/:userId/*` doit refuser si `userId` n'est pas la personne connectée. Aujourd'hui, n'importe qui peut pointer pour n'importe qui.
2. **Lecture** : `GET /clocks/:id`, `GET /clocks/:id/status`, `GET /workingtimes/:id`, `GET /absences/user/:id`, `GET /account-requests/user/:id` et `GET /teams/:id` doivent appliquer `assertCanReadUser` (soi-même, sa branche, ou admin).
3. **Demandes en attente** : `GET /absences/pending` et `GET /account-requests/pending` renvoient celles de **toute l'entreprise**. Il faut ne renvoyer que celles que la personne connectée peut traiter, et vérifier ce droit dans `PATCH …/decision` (même règle que `assertCanManageUser`).

### Règles métier

4. **Motif de refus obligatoire** : `decisionComment` requis si `status = REJECTED`. Refuser aussi une demande déjà traitée.
5. **Fuseau horaire** : `kpi/lateness.ts` et `workingtimes.service.ts` calculent en UTC (`getUTCHours`, `toISOString().slice(0, 10)`). En France, une arrivée à 09:15 est enregistrée 07:15 UTC et **n'est pas comptée en retard**. Il faut calculer en **Europe/Paris**.
6. **Absence validée = pas de retard** : un jour couvert par une absence validée (rendez-vous médical, oubli de pointage…) ne doit pas compter de retard ni d'heures manquantes.
7. **Pointages à la milliseconde** : `clocks.time` est un `datetime` sans fraction. Deux pointages dans la même seconde (double appui) ne sont plus ordonnés, et le backend se trompe de dernier pointage (constaté pendant les tests). Utiliser `datetime(3)`.
8. **Changement de jour** : `ClocksService.allowed` regarde le dernier pointage, quel que soit le jour. Si quelqu'un oublie de pointer son départ, il ne peut plus pointer son arrivée le lendemain.
9. **Historique des plannings** : changer l'heure d'arrivée d'un salarié recalcule ses retards passés. Il faut garder les plannings avec une date de début de validité.

### Pour que l'app (et le site) n'aient plus de calculs à faire

10. **Journées calculées** : `GET /workingtimes/:userId?from&to` pourrait renvoyer, par jour, `{ date, arrival, departure, workedMinutes, breakMinutes, lateMinutes, excused }`. Aujourd'hui l'app recalcule ces valeurs à partir des pointages (`src/domain/time.ts`).
11. **Présence de l'équipe en un appel** : `GET /presence` → `[{ userId, state, since, lateMinutes, absent }]`. L'app fait aujourd'hui un appel `GET /clocks/:id/status` par salarié, et ne peut pas afficher « absent » ni « en retard aujourd'hui ».
12. **Filtre par dates** sur `GET /clocks/:userId?from&to` (l'app filtre elle-même pour l'instant).
13. **Nom du décideur** dans les absences et les demandes (`decidedBy: { firstName, lastName }`) : un employé ne peut pas lire la fiche de son manager.
14. **KPI** : `punctualityPct` compte la part de salariés *sans alerte* ; un taux de jours à l'heure (1 − jours en retard / jours travaillés) serait plus juste. `avgWeeklyHours` suppose 5 jours travaillés par semaine.

### Divers

15. **Messages d'erreur en français** : l'app affiche le message du backend tel quel (« Invalid credentials », « You already have a pending request »…).
16. **Tests des routes** (e2e avec supertest) : aucune route n'est testée pour l'instant.
17. **Connexion Microsoft** : encore un commentaire dans `auth.controller.ts`.
18. **Envoi du justificatif** : `attachmentPath` est une chaîne ; l'envoi du fichier lui-même n'existe pas encore.
