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

L'adresse de l'API est **figée dans l'APK** au moment du build. Pour la changer : `PUBLIC_API_URL=http://192.168.x.x:8080/api` dans le `.env` à la racine, puis relancer le build.

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

**Sécurité :** le HTTP non chiffré est autorisé (`usesCleartextTraffic` dans `app.json`) pour joindre l'API de développement. En production, passez l'API en HTTPS et retirez ce réglage.
