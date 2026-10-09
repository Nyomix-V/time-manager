# syntax=docker/dockerfile:1
# =============================================================
#  Mobile (Expo / React Native) — construit l'APK Android
#  Étapes :
#    android-sdk -> Node + JDK 17 + SDK Android (lourd, mis en cache)
#    build       -> npm ci, expo prebuild, gradle assembleRelease
#    artifact    -> image légère qui ne contient que l'APK
#  Lancement :  docker compose up (avec le reste), ou seul : docker compose up --build mobile-builder
#  Résultat  :  mobile/artifacts/time-manager.apk, téléchargeable sur http://localhost:8080/apk/time-manager.apk
# =============================================================

# ---- android-sdk ----
# Node 22 : React Native 0.86 demande Node >= 20.19.
FROM node:22-bookworm AS android-sdk

# Versions alignées sur react-native 0.86 (node_modules/react-native/gradle/libs.versions.toml).
ARG CMDLINE_TOOLS_VERSION=11076708
ARG ANDROID_PLATFORM=android-36
ARG ANDROID_BUILD_TOOLS=36.0.0
ARG ANDROID_NDK=27.1.12297006
ARG ANDROID_CMAKE=3.22.1

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=${PATH}:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools

# JDK 17 : requis par Gradle et l'Android Gradle Plugin 8.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jdk-headless unzip \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools \
    && curl -fsSL -o /tmp/cmdline-tools.zip \
       https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip \
    && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools \
    && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm /tmp/cmdline-tools.zip

RUN yes | sdkmanager --licenses > /dev/null \
    && sdkmanager --install \
       "platform-tools" \
       "platforms;${ANDROID_PLATFORM}" \
       "build-tools;${ANDROID_BUILD_TOOLS}" \
       "ndk;${ANDROID_NDK}" \
       "cmake;${ANDROID_CMAKE}" > /dev/null

# ---- build ----
FROM android-sdk AS build
WORKDIR /app

# Dépendances d'abord : cette couche reste en cache tant que package*.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# L'adresse de l'API est figée dans l'APK au moment du bundle JavaScript.
# 10.0.2.2 = la machine hôte vue depuis l'émulateur Android.
ARG EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
# 1 = mode démo (faux comptes, aucun appel au backend).
ARG EXPO_PUBLIC_MOCK=0
ENV EXPO_PUBLIC_MOCK=${EXPO_PUBLIC_MOCK}
ENV NODE_ENV=production

# Génère le projet Android natif (dossier android/, jamais versionné).
RUN npx expo prebuild --platform android --no-install

# arm64-v8a = téléphones, x86_64 = émulateurs. Chaque architecture ajoutée rallonge la compilation C++.
ARG ANDROID_ARCHS=arm64-v8a,x86_64
# Signé avec la clé de debug générée par prebuild : suffisant pour installer l'APK, pas pour le Play Store.
# Le cache Gradle (/root/.gradle) est conservé entre deux builds : les dépendances ne sont téléchargées qu'une fois.
WORKDIR /app/android
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=${ANDROID_ARCHS}

# ---- artifact ----
FROM alpine:3.20 AS artifact
COPY --from=build /app/android/app/build/outputs/apk/release/app-release.apk /apk/time-manager.apk
# Le volume ./mobile/artifacts est monté sur /output (docker-compose.yml).
CMD ["sh", "-c", "mkdir -p /output && cp /apk/time-manager.apk /output/ && echo 'APK disponible : mobile/artifacts/time-manager.apk'"]
