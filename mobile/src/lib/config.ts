// Réglages figés dans l'app au moment du build (variables EXPO_PUBLIC_*).

// Adresse de l'API. 10.0.2.2 = la machine hôte vue depuis l'émulateur Android.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api';

// Mode démo : faux comptes et fausses données, aucun appel au backend.
// Activé avec EXPO_PUBLIC_MOCK=1 (fichier .env en dev, ou MOBILE_MOCK=1 pour le build Docker).
export const MOCK = process.env.EXPO_PUBLIC_MOCK === '1';
