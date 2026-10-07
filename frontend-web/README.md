# Time Manager — Frontend web

Application web de Time Manager, construite à partir des maquettes de `docs/maquettes/web` (écrans 01 à 18).

## Stack

| Besoin | Outil | Pourquoi |
|---|---|---|
| UI | React 19 + TypeScript | Même langage que le back (NestJS), types partagés |
| Build / dev | Vite | Démarrage instantané, build statique servi par nginx |
| Routing | React Router | Routes protégées par rôle (`RequireRole`) |
| Appels API | axios + TanStack Query | Cache, chargement, erreurs, rafraîchissement après une action |
| Formulaires | React Hook Form + Zod | Validation côté client alignée sur les DTO du back |
| Style | Tailwind CSS + composants façon shadcn/ui (Radix) | Couleurs des maquettes en tokens ; modales accessibles (focus, Échap, ARIA) |
| Graphiques | Recharts | KPI ; chaque graphique a aussi un tableau caché pour les lecteurs d'écran |
| Tests | Vitest + Testing Library | Même API que Jest (utilisé côté back) |
| Qualité | ESLint + `jsx-a11y` (strict) + Prettier | Accessibilité vérifiée dès le lint |

## Lancer

Avec Docker, depuis la racine du projet :

```bash
docker compose up --build
docker exec tm_backend npm run seed     # comptes de test, mot de passe : password123
```

Puis ouvrir <http://localhost:8080>. Comptes : `employee@trinity.io`, `manager@trinity.io`, `directeur@trinity.io`, `admin@trinity.io`.

Sans Docker (le back doit tourner sur le port 3000) :

```bash
npm ci
npm run dev        # http://localhost:5173, /api est redirigé vers localhost:3000
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm run build` | Vérification TypeScript + build de prod dans `dist/` |
| `npm run lint` | ESLint (dont les règles d'accessibilité) |
| `npm test` / `npm run test:cov` | Tests / tests avec couverture (`coverage/`) |

## Organisation

```
src/
├── api/          appels REST + hooks TanStack Query, un fichier par ressource
├── auth/         session (AuthProvider), gardes de routes, permissions, menus par rôle
├── components/   composants partagés (ui/ = briques de base, layout/, hours/, kpi/, users/)
├── hooks/        hooks génériques (période, pagination, heure courante)
├── lib/          fonctions pures testées : formats, périodes, pointages, KPI
├── pages/        un écran par fichier, rangés par rôle (employee, manager, admin)
└── router.tsx    routes et rôles autorisés
```

Les calculs métier (heures travaillées, retards, heures sup) sont faits **par le back**. Le front ne fait que les agréger pour l'affichage (moyennes d'équipe), plus le compteur en direct de la journée en cours.

## Sécurité

- **Access token en mémoire uniquement**, jamais dans `localStorage`, donc illisible par un script injecté (XSS).
- **Refresh token en cookie httpOnly** (à implémenter côté back) : au rechargement de la page, `POST /auth/refresh` redonne un access token. Sur une 401, le client rafraîchit une fois puis rejoue la requête.
- Les pages sont protégées par rôle, mais **c'est le back qui fait foi** : masquer un bouton n'est qu'un confort.
- En prod, nginx ajoute une CSP stricte, limite `/api/auth/login` à 5 essais par minute et par IP, et la police est servie localement (aucune IP envoyée à Google Fonts, RGPD).

## Accessibilité

- `eslint-plugin-jsx-a11y` en mode strict.
- Audit axe-core (WCAG 2.1 AA) passé sur les 13 écrans principaux : 0 violation. Deux couleurs des maquettes (succès, alerte) ont été foncées pour atteindre un contraste de 4,5:1.
- Navigation au clavier, lien « Aller au contenu », focus visible, focus déplacé sur le contenu à chaque changement de page.
- Libellés liés aux champs, erreurs annoncées (`role="alert"`, `aria-invalid`, `aria-describedby`).
- Mise en page responsive, testée à 390 px de large.

## Endpoints attendus côté back

Le front est déjà branché sur ces routes, qui n'existent pas encore. En attendant, les écrans concernés affichent « Cette fonctionnalité n'est pas encore disponible côté serveur ».

| Route | Écran | Note |
|---|---|---|
| `POST /auth/refresh`, `POST /auth/logout` | Toutes | Refresh token en cookie httpOnly `SameSite=Strict`. Sans cette route, un rechargement de page déconnecte. |
| `GET/POST/PUT/DELETE /teams` | Équipes, Branches | `{ id, name, description, branchId, managerId, memberIds[] }`. Exigé par le sujet. |
| `GET /requests/me`, `GET /requests`, `POST /requests`, `PATCH /requests/:id/decision` | Profil, Demandes à valider | Demandes de modification ou de suppression de compte validées par le manager |
| `PUT /auth/password` | Profil | `{ currentPassword, newPassword }` |
| `POST /auth/forgot-password` | Mot de passe oublié | Même réponse que le compte existe ou non |
| `GET /auth/microsoft` (+ callback) | Connexion | Après le callback : poser le cookie de refresh puis rediriger vers `/` |

Améliorations utiles :
- `GET /absences?status=PENDING` : aujourd'hui, l'écran du manager charge les absences salarié par salarié.
- `GET /clocks?date=` : même chose pour l'écran admin des pointages.
- Un type de pointage `PAUSE` : le back ne connaît que IN/OUT. Le front retient localement qu'un OUT était une pause.
- Un `comment` dans `PATCH /absences/:id/decision`, pour expliquer un refus.
