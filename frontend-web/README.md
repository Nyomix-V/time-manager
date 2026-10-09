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
```

Puis ouvrir <http://localhost:8080>. Au premier démarrage, le backend crée les comptes de test (mot de passe : `password123`) : `employee@trinity.io`, `manager@trinity.io`, `directeur@trinity.io`, `admin@trinity.io`.

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

Les calculs métier (heures travaillées, pauses, retards, heures sup, résumé KPI) sont faits **par le back**. Le front ne fait que regrouper les lignes KPI par équipe ou par branche, avec les mêmes formules que le back, et calcule le compteur en direct de la journée en cours.

## Sécurité

- **Access token en mémoire uniquement**, jamais dans `localStorage`, donc illisible par un script injecté (XSS).
- **Refresh token en cookie httpOnly** (pas encore implémenté côté back) : au rechargement de la page, `POST /auth/refresh` redonnera un access token. Sur une 401, le client rafraîchit une fois puis rejoue la requête.
- **Pas d'auto-inscription** : un compte est créé par un manager, un directeur ou l'admin (statut « invité »), puis activé par la personne via un lien valable 48 h.
- Les pages sont protégées par rôle, mais **c'est le back qui fait foi** : masquer un bouton n'est qu'un confort.
- En prod, nginx ajoute une CSP stricte, limite `/api/auth/login` à 5 essais par minute et par IP, et la police est servie localement (aucune IP envoyée à Google Fonts, RGPD).

## Accessibilité

- `eslint-plugin-jsx-a11y` en mode strict.
- Audit axe-core (WCAG 2.1 AA) passé sur les 13 écrans principaux : 0 violation. Deux couleurs des maquettes (succès, alerte) ont été foncées pour atteindre un contraste de 4,5:1.
- Navigation au clavier, lien « Aller au contenu », focus visible, focus déplacé sur le contenu à chaque changement de page.
- Libellés liés aux champs, erreurs annoncées (`role="alert"`, `aria-invalid`, `aria-describedby`).
- Mise en page responsive, testée à 390 px de large.

## Connexion Microsoft (SSO)

Le flux est géré côté serveur :
1. Le bouton « Se connecter avec Microsoft » vérifie d'abord que le SSO est configuré, puis ouvre `/api/auth/microsoft`.
2. Le back redirige vers Microsoft, qui renvoie vers `/api/auth/microsoft/callback`.
3. Le back retrouve le compte par email et renvoie vers `FRONTEND_URL/login?token=…`.
4. La page `/login` retire le jeton de l'URL, ouvre la session et redirige vers l'accueil.

Pour l'activer :
1. Enregistrer une application dans Azure AD (Entra ID), avec comme URI de redirection `http://localhost:8080/api/auth/microsoft/callback`.
2. Renseigner `MS_CLIENT_ID`, `MS_CLIENT_SECRET` et `MS_TENANT_ID` (l'ID du tenant de l'entreprise plutôt que `common`) dans le `.env` à la racine.
3. Recréer le back : `docker compose up -d --force-recreate backend`.
4. Le compte Time Manager doit exister avec **la même adresse email** que le compte Microsoft : il est créé par un manager, il n'y a pas d'inscription automatique.

## Ce qui manque encore côté back

| Route | Écran | Note |
|---|---|---|
| `POST /auth/refresh`, `POST /auth/logout` | Toutes | Refresh token en cookie httpOnly `SameSite=Strict`. Sans cette route, **un rechargement de page déconnecte**. |

Améliorations utiles :
- Un historique des demandes traitées pour un périmètre (aujourd'hui, l'onglet « Traitées » charge les demandes salarié par salarié).
- `GET /clocks?date=` (tous les pointages d'un jour) pour l'écran admin des pointages, qui charge aujourd'hui les pointages personne par personne.
- L'envoi des emails (activation, mot de passe oublié) : en attendant, le lien d'activation est affiché au manager après la création, et le lien de réinitialisation n'apparaît qu'en développement.
