// Connexion avec un compte Microsoft (sujet : « allow employees to log in with their Microsoft account »).
// 1. L'app ouvre GET /auth/microsoft?client=mobile dans un onglet du navigateur (Chrome Custom Tab).
// 2. Après la connexion chez Microsoft, le backend crée NOTRE jeton et redirige vers l'app : timemanager://login?token=…
// 3. openAuthSessionAsync intercepte cette adresse et rend la main à l'app.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { API_URL } from '@/lib/config';

/** Adresse de retour dans l'app : schéma « timemanager » d'app.json, même valeur que MOBILE_SSO_REDIRECT côté backend. */
export const MICROSOFT_REDIRECT = 'timemanager://login';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Le jeton de l'app, ou null si la personne a fermé la page sans se connecter. */
export async function signInWithMicrosoft(): Promise<string | null> {
  const result = await WebBrowser.openAuthSessionAsync(`${API_URL}/auth/microsoft?client=mobile`, MICROSOFT_REDIRECT);
  if (result.type !== 'success') return null;

  const params = Linking.parse(result.url).queryParams ?? {};
  const token = first(params.token);
  if (token) return token;
  throw new Error(first(params.error) ?? 'Connexion Microsoft impossible.');
}
