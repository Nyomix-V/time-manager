import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { activateAccount, resetPassword } from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/auth/navigation';
import { passwordSchema } from '@/lib/password';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/Field';

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  });

const COPY = {
  activate: {
    title: 'Activer mon compte',
    intro: 'Bienvenue ! Choisissez le mot de passe de votre compte Time Manager.',
    submit: 'Activer mon compte',
    done: 'Votre compte est activé. Vous pouvez maintenant vous connecter.',
    send: activateAccount,
  },
  reset: {
    title: 'Nouveau mot de passe',
    intro: 'Choisissez un nouveau mot de passe.',
    submit: 'Enregistrer le mot de passe',
    done: 'Mot de passe modifié. Vous pouvez vous connecter.',
    send: resetPassword,
  },
};

/** Shared by the activation link (new account, valid 48 h) and the reset link (valid 30 min). */
export function SetPasswordPage({ mode }: { mode: 'activate' | 'reset' }) {
  const copy = COPY[mode];
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }: z.infer<typeof schema>) => {
    setServerError(null);
    try {
      await copy.send(token!, password);
      setDone(true);
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <Card className="w-full max-w-[440px] gap-5 p-10">
      <div>
        <h1 className="text-[26px] font-bold">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.intro}</p>
      </div>
      {!token ? (
        <Alert tone="danger" role="alert">
          Lien incomplet : ouvrez le lien exact reçu par email.
        </Alert>
      ) : done ? (
        <>
          <Alert tone="success" role="status">
            {copy.done}
          </Alert>
          <Button asChild className="w-full">
            <Link to={ROUTES.login}>Se connecter</Link>
          </Button>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <Field
            label="Mot de passe"
            error={errors.password?.message}
            hint="12 caractères minimum, avec une majuscule, un chiffre et un caractère spécial."
          >
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </Field>
          <Field label="Confirmer le mot de passe" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirm')} />
          </Field>
          {serverError && (
            <Alert tone="danger" role="alert">
              {serverError}
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {copy.submit}
          </Button>
        </form>
      )}
      <Link to={ROUTES.login} className="text-[13px] font-semibold text-primary hover:underline">
        ← Retour à la connexion
      </Link>
    </Card>
  );
}
