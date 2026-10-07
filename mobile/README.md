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

- **Émulateur Android** : touche `a` dans le terminal d'Expo. L'API est alors à `http://10.0.2.2:8080/api`.
- **Téléphone réel** : installez l'app **Expo Go** et scannez le QR code. Le téléphone doit être sur le même Wi-Fi que le PC, et `EXPO_PUBLIC_API_URL` doit pointer vers l'IP du PC (`http://192.168.x.x:8080/api`).
- Le backend doit tourner : `docker compose up` à la racine du projet.

### Mode démo (sans backend)

Avec `EXPO_PUBLIC_MOCK=1` dans `.env`, l'app n'appelle plus le backend : elle simule la connexion et le pointage avec des données en mémoire (remises à zéro à chaque redémarrage). L'écran de connexion propose un bouton par rôle.

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
├── app/                 → écrans (Expo Router : un fichier = un écran)
│   ├── _layout.tsx      → connexion obligatoire (Stack.Protected)
│   ├── login.tsx
│   └── (tabs)/          → onglets, selon le rôle
│       ├── index.tsx    → pointage (branché sur l'API)
│       ├── heures.tsx, absences.tsx, profil.tsx
│       └── equipe.tsx, demandes.tsx   → manager et directeur
├── auth/                → session (jeton JWT dans le stockage chiffré du téléphone)
├── components/ui.tsx    → boutons, cartes, badges
├── lib/api.ts           → appels à l'API
└── theme/tokens.ts      → couleurs des maquettes
```

## État actuel

| Fonctionnalité | État |
|---|---|
| Connexion email / mot de passe | Branchée (`POST /auth/login`) |
| Connexion Microsoft | Bouton présent, désactivé : routes backend à faire |
| Pointage arrivée / départ | Branché (`GET` et `POST /clocks/:userId`) |
| Pause | Bouton présent, désactivé : route backend à faire |
| Mes heures, absences, équipe, demandes | Écrans à développer |
| Profil | Email, rôle et déconnexion |
| Mode démo | Connexion et pointage simulés (`EXPO_PUBLIC_MOCK=1`) |

**Sécurité :** le HTTP non chiffré est autorisé (`usesCleartextTraffic` dans `app.json`) pour joindre l'API de développement. En production, passez l'API en HTTPS et retirez ce réglage.
