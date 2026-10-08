# Time Manager — application mobile

Application Android des employés, managers et directeurs : Expo (SDK 57), React Native, TypeScript, Expo Router.
Les écrans suivent les maquettes de `docs/maquettes/mobile/`.

## Développer

```bash
cd mobile
npm install
cp .env.example .env      # puis réglez EXPO_PUBLIC_API_URL
npx expo start
```

- **Émulateur Android** : touche `a` dans le terminal d'Expo. L'API est alors à `http://10.0.2.2:8080/api` (via le proxy) ou `http://10.0.2.2:3000` (backend en direct).
- **Téléphone réel** : installez l'app **Expo Go** et scannez le QR code. Le téléphone doit être sur le même Wi-Fi que le PC, et `EXPO_PUBLIC_API_URL` doit pointer vers l'IP du PC (`http://192.168.x.x:3000`).

### Avec le vrai backend

À la racine du projet :

```bash
docker compose up -d database backend
docker compose exec backend npm run seed
```

Comptes créés par le seed (mot de passe `password123`) : `employee@trinity.io`, `manager@trinity.io`, `directeur@trinity.io`, `admin@trinity.io`.

Le plus simple pour un téléphone branché en USB : faire pointer son `localhost:3000` vers celui du PC, puis construire l'APK avec cette adresse.

```bash
adb reverse tcp:3000 tcp:3000
```

Dans le `.env` à la racine : `PUBLIC_API_URL=http://localhost:3000` et `MOBILE_MOCK=0`, puis construire l'APK (voir plus bas). La redirection `adb reverse` est à refaire à chaque fois que le téléphone est rebranché.

Les routes utilisées et ce qui manque encore côté backend sont dans [API.md](API.md).

### Mode démo (sans backend)

Avec `EXPO_PUBLIC_MOCK=1` dans `.env`, l'app n'appelle plus le backend : un faux backend (`src/mock`) répond sur les mêmes routes, avec deux mois d'historique en mémoire (remis à zéro à chaque redémarrage). L'écran de connexion propose un bouton par rôle.

| Compte | Mot de passe | Rôle |
|---|---|---|
| `employe@demo.fr` | `demo1234` | Employé |
| `manager@demo.fr` | `demo1234` | Manager |
| `directeur@demo.fr` | `demo1234` | Directeur |
| `admin@demo.fr` | `demo1234` | Admin |

Un jeton du mode démo est refusé par une app construite sans mode démo : il ne peut pas servir face au vrai backend.

Avant de pousser :

```bash
npm run typecheck
npx expo-doctor
```

Ajoutez toujours une dépendance avec `npx expo install <paquet>` (pas `npm install`) : Expo choisit la version compatible avec le SDK.

## Construire l'APK (Docker)

Depuis la racine du projet :

```bash
docker compose --profile mobile up --build mobile-builder
```

L'APK arrive dans `mobile/artifacts/time-manager.apk`. Le premier build est long (SDK Android, Gradle : compter 15 à 30 minutes et plusieurs Go) ; les suivants réutilisent le cache Docker.

Les réglages sont **figés dans l'APK** au moment du build. Ils se mettent dans le `.env` à la racine du projet :

| Variable | Défaut | Rôle |
|---|---|---|
| `PUBLIC_API_URL` | `http://10.0.2.2:8080/api` | Adresse de l'API (`10.0.2.2` = le PC vu depuis l'émulateur) |
| `MOBILE_MOCK` | `0` | `1` = APK en mode démo |
| `MOBILE_ARCHS` | `arm64-v8a,x86_64` | `arm64-v8a` seul = build plus rapide, téléphones réels uniquement |

Le cache Gradle est conservé entre deux builds : seul le premier télécharge les dépendances.

Installer l'APK sur un téléphone branché en USB (débogage USB activé) :

```bash
adb install -r mobile/artifacts/time-manager.apk
```

## Organisation

```
src/
├── app/                   → écrans (Expo Router : un fichier = un écran)
│   ├── _layout.tsx        → connexion obligatoire (Stack.Protected)
│   ├── login.tsx
│   └── (tabs)/            → onglets, selon le rôle
│       ├── index.tsx      → pointage (arrivée, pause, départ, planning du jour)
│       ├── heures.tsx     → mes heures (semaine, mois, période)
│       ├── absences.tsx   → nouvelle demande / historique
│       ├── profil.tsx     → infos, demandes au responsable, mot de passe
│       ├── equipe/        → manager et directeur : présence en direct, fiche salarié
│       └── demandes.tsx   → manager et directeur : valider / refuser
├── api/                   → types et fonctions d'accès aux données (seul endroit à adapter au backend)
├── domain/                → calculs d'heures, libellés, droits affichés
├── mock/                  → faux backend du mode démo (données + routes)
├── components/            → composants des maquettes (ui, data, forms, Sheet)
├── hooks/                 → chargement des données, heure en direct
├── auth/                  → session (jeton JWT dans le stockage chiffré du téléphone)
└── theme/tokens.ts        → couleurs des maquettes
```

Les routes utilisées sont listées dans [API.md](API.md).

## État actuel

Tous les écrans des maquettes sont développés et **branchés sur le backend** (ou sur le mode démo), y compris ses règles de sécurité et de calcul de la branche `fix/backend-regles-securite` (PR #3). Ce qui reste à faire côté backend (présence de l'équipe en un appel, historique des plannings, connexion Microsoft…) est listé dans [API.md](API.md).

| Écran | Rôles |
|---|---|
| Connexion (Microsoft : bouton désactivé, route à faire) | tous |
| Pointage avec pauses, planning du jour | sauf admin |
| Mes heures | employé |
| Absences (demande, historique) | sauf admin |
| Profil, demandes au responsable, mot de passe | tous |
| Équipe : présence en direct, KPI, fiche salarié avec absences | manager, directeur |
| Demandes à valider | manager, directeur |

**Sécurité :** le HTTP non chiffré est autorisé (`usesCleartextTraffic` dans `app.json`) pour joindre l'API de développement. En production, passez l'API en HTTPS et retirez ce réglage.
