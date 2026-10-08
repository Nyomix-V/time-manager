# API utilisée par l'application mobile

L'app appelle le backend NestJS du dépôt (`backend/`). Toutes les routes sont dans `src/api/index.ts`, les formats dans `src/api/types.ts` (copie des entités de `backend/src/entities`). Le mode démo (`src/mock/server.ts`) répond sur **les mêmes routes, avec les mêmes formats et les mêmes règles**.

## Routes utilisées

| Écran | Routes |
|---|---|
| Connexion | `POST /auth/login` |
| Pointage | `GET /users/:id` (planning), `GET /clocks/:id?from` (pointages du jour), `POST /clocks/:id/arrive` · `break/start` · `break/end` · `depart` |
| Mes heures | `GET /users/:id`, `GET /clocks/:id?from&to`, `GET /absences/user/:id` |
| Absences | `POST /absences`, `GET /absences/user/:id` |
| Profil | `GET /users/:id`, `GET /account-requests/user/:id`, `POST /account-requests`, `POST /auth/change-password` |
| Équipe | `GET /users`, `GET /teams`, `GET /kpi/report?from&to&teamId`, `GET /clocks/:id/status` (une fois par salarié) |
| Fiche salarié | `GET /users/:id`, `GET /clocks/:id?from`, `GET /absences/user/:id`, `GET /teams`, `PUT /users/:id`, `DELETE /users/:id` |
| Demandes | `GET /absences/pending`, `GET /account-requests/pending`, `PATCH /absences/:id/decision`, `PATCH /account-requests/:id/decision` |

Vérifié le 8 octobre 2026 contre le backend de la branche `fix/backend-regles-securite` (PR #3), en mode démo et contre le vrai backend, avec le même script de contrat : formats, règles de sécurité, refus sans motif, nom du décideur, KPI.

## Règles communes à l'app et au backend

- **Journées et retards** à l'heure locale (Europe/Paris côté backend, heure du téléphone côté app). Un retard commence à la première minute après l'heure d'arrivée prévue.
- **Absence validée = retard excusé** : un retard un jour couvert par une absence validée ne compte pas (`excusedDays` dans `src/domain/time.ts`, `excusedDays` dans `backend/src/kpi/kpi.module.ts`). L'app l'affiche « Retard excusé ».
- **Moyenne par semaine** = total ÷ (jours travaillés ÷ jours du planning), au moins une semaine.
- **Ponctualité** (KPI) = part des jours travaillés commencés à l'heure.
- **Pointage** : chaque journée repart de zéro ; un départ oublié la veille ne bloque pas l'arrivée.

## Ce qui reste à faire dans le backend

1. **Historique des plannings** : changer l'heure d'arrivée d'un salarié recalcule ses retards passés. Il faut garder les plannings avec une date de début de validité.
2. **Journées calculées** : `GET /workingtimes/:userId?from&to` pourrait renvoyer, par jour, `{ date, arrival, departure, workedMinutes, breakMinutes, lateMinutes, excused }`. Aujourd'hui l'app recalcule ces valeurs à partir des pointages (`src/domain/time.ts`), avec les mêmes règles.
3. **Présence de l'équipe en un appel** : `GET /presence` → `[{ userId, state, since, lateMinutes, absent }]`. L'app fait aujourd'hui un appel `GET /clocks/:id/status` par salarié, et ne peut pas afficher « absent » ni « en retard aujourd'hui ».
4. **Connexion Microsoft** : encore un commentaire dans `auth.controller.ts`.
5. **Envoi du justificatif** : `attachmentPath` est une chaîne ; l'envoi du fichier lui-même n'existe pas encore.
6. **Intégration continue** (GitHub Actions) : build, tests, analyse de sécurité, couverture.

Fait dans la PR #3 : routes limitées au périmètre de chacun, calculs à l'heure de Paris, absence validée = retard excusé, pointages à la milliseconde, changement de jour, motif de refus obligatoire, nom du décideur, filtre par dates sur les pointages, KPI corrigés, messages d'erreur en français, tests des routes.
