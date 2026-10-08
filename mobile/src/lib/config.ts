// Réglages figés dans l'app au moment du build (variables EXPO_PUBLIC_*).

// Adresse de l'API. 10.0.2.2 = la machine hôte vue depuis l'émulateur Android.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api';

// Adresse du site, pour les liens envoyés par email ou partagés (activation du compte, nouveau mot de passe).
// Par défaut, le site est derrière le même proxy que l'API : http://hôte:8080/api -> http://hôte:8080.
// null si on ne peut pas la deviner (API appelée en direct, sans proxy) : l'app affiche alors le code.
export const WEB_URL: string | null = process.env.EXPO_PUBLIC_WEB_URL || (/\/api\/?$/.test(API_URL) ? API_URL.replace(/\/api\/?$/, '') : null);

/** Lien d'une page du site qui attend un jeton (activation, réinitialisation). */
export const webLink = (path: string, token: string) => (WEB_URL ? `${WEB_URL}${path}?token=${encodeURIComponent(token)}` : null);

// Mode démo : faux comptes et fausses données, aucun appel au backend.
// Activé avec EXPO_PUBLIC_MOCK=1 (fichier .env en dev, ou MOBILE_MOCK=1 pour le build Docker).
export const MOCK = process.env.EXPO_PUBLIC_MOCK === '1';
