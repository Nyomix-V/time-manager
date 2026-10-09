import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { MICROSOFT_LOGIN_URL } from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { takeTokenFromUrl } from '@/lib/ssoToken';

/**
 * Microsoft SSO, last step (route /login). The flow is server-side:
 * "Se connecter avec Microsoft" -> GET /api/auth/microsoft -> Microsoft sign-in ->
 * GET /api/auth/microsoft/callback (the backend checks the code and matches the account)
 * -> redirect here with our own JWT.
 */
export function MicrosoftCallbackPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false); // React StrictMode runs effects twice in dev

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { token, error: urlError } = takeTokenFromUrl();
    const attempt =
      token && !urlError
        ? loginWithToken(token)
        : Promise.reject(new Error(urlError ?? 'Connexion Microsoft interrompue : aucun jeton reçu.'));
    attempt
      .then(() => navigate('/', { replace: true }))
      .catch((e) => {
        const status = (e as { response?: { status?: number } }).response?.status;
        setError(status === 401 ? 'Le jeton de connexion est invalide ou a expiré.' : getErrorMessage(e));
      });
  }, [loginWithToken, navigate]);

  return (
    <Card className="w-full max-w-[440px] gap-5 p-10">
      <h1 className="text-[26px] font-bold">Connexion avec Microsoft</h1>
      {error ? (
        <>
          <Alert tone="danger" role="alert">
            <span>
              {error}
              <span className="mt-1 block text-xs">
                Votre compte Time Manager doit avoir été créé par votre manager avec la même adresse email que
                votre compte Microsoft.
              </span>
            </span>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={MICROSOFT_LOGIN_URL}>Réessayer</a>
            </Button>
            <Button variant="secondary" asChild>
              <Link to={ROUTES.login}>Connexion par email</Link>
            </Button>
          </div>
        </>
      ) : (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Connexion en cours…
        </p>
      )}
    </Card>
  );
}
