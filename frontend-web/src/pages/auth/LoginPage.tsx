import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { checkMicrosoftLogin, MICROSOFT_LOGIN_URL } from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/Field';

const schema = z.object({
  email: z.string().min(1, "L'adresse email est obligatoire.").email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [msPending, setMsPending] = useState(false);

  const loginWithMicrosoft = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setServerError(null);
    setMsPending(true);
    const problem = await checkMicrosoftLogin();
    if (problem) {
      setServerError(problem);
      setMsPending(false);
    } else {
      window.location.assign(MICROSOFT_LOGIN_URL); // the backend redirects to Microsoft
    }
  };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password }: FormValues) => {
    setServerError(null);
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <Card className="w-full max-w-[440px] gap-5 p-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
        aria-labelledby="login-title"
      >
        <div>
          <h1 id="login-title" className="text-[26px] font-bold">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-muted">Connectez-vous avec le compte créé par votre manager.</p>
        </div>

        {serverError && (
          <Alert tone="danger" role="alert">
            {serverError}
          </Alert>
        )}

        <Field label="Adresse email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="username"
            placeholder="prenom.nom@example.com"
            {...register('email')}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[13px] font-medium">
              Mot de passe
            </label>
            <Link
              to={ROUTES.forgotPassword}
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="pr-11"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1.5 text-muted"
            >
              {showPassword ? (
                <EyeOff className="size-[18px]" aria-hidden />
              ) : (
                <Eye className="size-[18px]" aria-hidden />
              )}
            </button>
          </div>
          {errors.password && (
            <span id="password-error" role="alert" className="text-xs text-danger">
              {errors.password.message}
            </span>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[13px] text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        ou
      </div>
      {/* Server-side OAuth flow: the backend redirects to Microsoft, then back with the session cookie. */}
      <Button variant="secondary" className="w-full" asChild>
        <a href={MICROSOFT_LOGIN_URL} onClick={loginWithMicrosoft} aria-disabled={msPending || undefined}>
          <MicrosoftLogo />
          Se connecter avec Microsoft
        </a>
      </Button>
      <p className="text-center text-xs text-muted">Pas encore de compte ? Il est créé par votre manager.</p>
    </Card>
  );
}

export function MicrosoftLogo() {
  return (
    <span aria-hidden className="grid size-[18px] shrink-0 grid-cols-2 gap-0.5">
      <i className="bg-[#f25022]" />
      <i className="bg-[#7fba00]" />
      <i className="bg-[#00a4ef]" />
      <i className="bg-[#ffb900]" />
    </span>
  );
}
