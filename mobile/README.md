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

Le contrat d'API attendu du backend (routes, formats, droits) est décrit dans [API.md](API.md).

## État actuel

Tous les écrans des maquettes sont développés et fonctionnent en **mode démo**. Pour le vrai backend, il manque des routes : voir [API.md](API.md).

| Écran | Rôles | Routes du backend |
|---|---|---|
| Connexion | tous | ✅ existe (Microsoft : à faire) |
| Pointage avec pauses, planning du jour | sauf admin | 🟡 pauses et planning à ajouter |
| Mes heures | employé | 🟡 filtre de dates à ajouter |
| Absences (demande, historique) | sauf admin | 🟡 type, justificatif, motif de refus à ajouter |
| Profil, demandes au responsable, mot de passe | tous | 🆕 à créer |
| Équipe : présence en direct, KPI, fiche salarié | manager, directeur | 🟡 présence, équipes, plannings à ajouter |
| Demandes à valider | manager, directeur | 🟡 / 🆕 |

**Sécurité :** le HTTP non chiffré est autorisé (`usesCleartextTraffic` dans `app.json`) pour joindre l'API de développement. En production, passez l'API en HTTPS et retirez ce réglage.
