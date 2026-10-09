# Time Manager

Gestion du temps de travail d'une entreprise à plusieurs branches : pointage avec pauses, heures et moyennes, retards, absences, équipes. Projet Epitech T-DEV-700.

| Partie | Dossier | Pour qui |
|---|---|---|
| API | [`backend/`](backend) — NestJS, TypeORM, MySQL | tout le reste |
| Site web | [`frontend-web/`](frontend-web) — React, Vite | tous les rôles, dont l'administrateur |
| Application Android | [`mobile/`](mobile) — Expo, React Native | employés, managers, directeurs |
| Proxy | [`reverse-proxy/`](reverse-proxy) — nginx | seule porte d'entrée publique |

Les maquettes sont dans [`docs/maquettes/`](docs/maquettes), les user stories dans [`user-stories.md`](user-stories.md).

## Démarrer

Prérequis : Docker Desktop (Compose v2). Aucun `.env` n'est nécessaire en développement : chaque réglage a une valeur par défaut, à changer si besoin en copiant [`.env.example`](.env.example) en `.env`.

```bash
docker compose up --build
```

Le premier lancement est long : l'APK Android est construit avec le reste (SDK Android et Gradle, compter 15 à 30 minutes et plusieurs Go). Les suivants réutilisent le cache Docker.

| Adresse | Contenu |
|---|---|
| http://localhost:8080 | site web |
| http://localhost:8080/api | API (derrière le proxy) |
| http://localhost:8080/apk/time-manager.apk | application Android à télécharger |
| http://localhost:8081 | phpMyAdmin, pour regarder la base (développement uniquement) |

Au premier démarrage, la base est vide : le backend y crée des comptes de démo, tous avec le mot de passe `password123`.

| Compte | Rôle |
|---|---|
| `employee@trinity.io` | employé |
| `manager@trinity.io` | manager |
| `directeur@trinity.io` | directeur |
| `admin@trinity.io` | administrateur (gère l'entreprise depuis le site) |

Les données sont gardées entre deux lancements (volume `db_data`). `docker compose exec backend npm run seed` recrée les comptes de démo supprimés ; `docker compose down -v` efface toute la base.

## Application sur un téléphone

L'APK construit par `docker compose up` est dans `mobile/artifacts/time-manager.apk`. Par défaut, il appelle `http://localhost:8080/api` : le téléphone doit donc joindre le port 8080 du PC.

**Téléphone branché en USB** (débogage USB activé) ou **émulateur Android** :

```bash
adb install -r mobile/artifacts/time-manager.apk
```

```bash
adb reverse tcp:8080 tcp:8080
```

La commande `adb reverse` est à refaire à chaque fois que le téléphone est rebranché. À l'installation, Google Play Protect peut proposer d'envoyer l'app à Google pour un contrôle : « Ne pas envoyer » suffit.

**Téléphone en Wi-Fi**, sur le même réseau que le PC : mettre `PUBLIC_API_URL=http://<IP du PC>:8080/api` dans le `.env`, puis reconstruire l'APK. Le pare-feu de Windows doit laisser passer le port 8080.

```bash
docker compose up --build mobile-builder
```

Plus de détails (mode démo sans backend, développement avec Expo) dans [`mobile/README.md`](mobile/README.md).

## Connexion Microsoft

Elle a besoin d'une application enregistrée dans Microsoft Entra ID (Azure). Ses identifiants se mettent dans le `.env`, jamais dans le dépôt :

```
MS_CLIENT_ID=...
MS_CLIENT_SECRET=...
MS_TENANT_ID=...
```

L'adresse de retour à déclarer dans Azure est `http://localhost:8080/api/auth/microsoft/callback`. Sans ces identifiants, le bouton Microsoft du site et de l'app indique que la connexion Microsoft n'est pas configurée ; la connexion par email reste disponible.

## Tests

| Partie | Commandes (dans le dossier de la partie, après `npm ci`) |
|---|---|
| Backend | `npm test`, `npm run test:cov` |
| Site web | `npm test`, `npm run lint`, `npm run build` |
| Application | `npm run typecheck` |

## Production

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Images sans dépendances de développement ni code monté, site servi en fichiers statiques par nginx, ports 80 et 443. Toutes les variables de [`docker-compose.prod.yml`](docker-compose.prod.yml) doivent être remplies dans `.env.prod` (jamais commité).

À faire : en production, `DB_SYNC=false` ne crée pas les tables et aucune migration initiale n'existe encore. Une base de production neuve reste donc vide.

## Travailler ensemble

- Une branche courte par sujet, créée depuis `main`, puis une pull request. Pas de push direct sur `main`.
- Avant la PR : les tests et le lint de la partie modifiée.
- Une branche fusionnée est supprimée.
