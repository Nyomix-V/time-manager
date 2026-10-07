import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { requestPasswordReset } from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/auth/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/Field';

const schema = z.object({
  email: z.string().min(1, "L'adresse email est obligatoire.").email('Adresse email invalide.'),
});

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: z.infer<typeof schema>) => {
    setServerError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
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
        aria-labelledby="fp-title"
      >
        <div>
          <h1 id="fp-title" className="text-[26px] font-bold">
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-muted">
            Saisissez votre adresse email : nous vous enverrons un lien valable 30 minutes pour choisir un
            nouveau mot de passe.
          </p>
        </div>
        {/* Same message whether the account exists or not: no account enumeration. */}
        {sent ? (
          <Alert tone="success" role="status">
            Si un compte correspond à cette adresse, un email vient de vous être envoyé.
          </Alert>
        ) : (
          <>
            {serverError && (
              <Alert tone="danger" role="alert">
                {serverError}
              </Alert>
            )}
            <Field label="Adresse email" error={errors.email?.message}>
              <Input type="email" autoComplete="username" {...register('email')} />
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Envoyer le lien
            </Button>
          </>
        )}
        <Alert tone="info">
          <Info aria-hidden />
          <span>Compte Microsoft ? Réinitialisez votre mot de passe depuis votre compte Microsoft.</span>
        </Alert>
        <Link to={ROUTES.login} className="text-[13px] font-semibold text-primary hover:underline">
          ← Retour à la connexion
        </Link>
      </form>
    </Card>
  );
}
