import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info, Lock, Mail, Phone, Shield } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { can, ROLE_LABELS } from '@/auth/permissions';
import { useCreateUser } from '@/api/users';
import { useBranch, useBranches } from '@/api/branches';
import { getErrorMessage } from '@/api/client';
import type { Role } from '@/api/types';
import { passwordSchema } from '@/lib/password';
import { PageHeader } from '@/components/PageHeader';
import { Field, ReadOnlyField } from '@/components/Field';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

const ROLES: Role[] = ['EMPLOYEE', 'MANAGER', 'DIRECTEUR', 'ADMIN'];

const schema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.'),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.string().trim().min(1, "L'email est obligatoire.").email('Adresse email invalide.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 .-]{6,20})?$/, 'Numéro de téléphone invalide.')
    .optional(),
  password: passwordSchema,
  role: z.enum(['EMPLOYEE', 'MANAGER', 'DIRECTEUR', 'ADMIN']),
  branchId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function EmployeeCreatePage() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const create = useCreateUser();
  const isAdmin = can(me.role, 'chooseRole');
  const branches = useBranches();
  const myBranch = useBranch(me.branchId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'EMPLOYEE', branchId: me.branchId ?? '' },
  });

  const onSubmit = (v: FormValues) =>
    create.mutate(
      {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || undefined,
        password: v.password,
        role: isAdmin ? v.role : 'EMPLOYEE',
        // A manager can only create people in their own branch (checked again by the backend).
        branchId: (isAdmin ? v.branchId : me.branchId) || undefined,
      },
      { onSuccess: (user) => navigate(ROUTES.employee(user.id)) },
    );

  return (
    <>
      <PageHeader
        title="Ajouter un salarié"
        breadcrumb={{ label: 'Salariés', to: isAdmin ? ROUTES.adminUsers : ROUTES.employees }}
        subtitle="Le compte est créé avec un mot de passe provisoire à transmettre au salarié."
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-4"
            aria-labelledby="id-title"
          >
            <CardTitle id="id-title">Identité</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" required error={errors.firstName?.message}>
                <Input autoComplete="off" {...register('firstName')} />
              </Field>
              <Field label="Nom" required error={errors.lastName?.message}>
                <Input autoComplete="off" {...register('lastName')} />
              </Field>
              <Field label="Adresse email professionnelle" required error={errors.email?.message}>
                <Input type="email" autoComplete="off" {...register('email')} />
              </Field>
              <Field label="Téléphone" error={errors.phone?.message}>
                <Input type="tel" autoComplete="off" {...register('phone')} />
              </Field>
            </div>

            <h2 className="mt-1 text-base font-semibold">Rattachement</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {isAdmin ? (
                <>
                  <Field label="Rôle" required>
                    <Select {...register('role')}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Branche">
                    <Select {...register('branchId')}>
                      <option value="">Aucune</option>
                      {branches.data?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              ) : (
                <>
                  <ReadOnlyField label="Rôle" value="Employé" />
                  <ReadOnlyField
                    label="Branche"
                    icon={<Lock aria-hidden />}
                    value={myBranch.data ? `${myBranch.data.name} (votre branche)` : '—'}
                  />
                </>
              )}
            </div>

            <h2 className="mt-1 text-base font-semibold">Accès</h2>
            <Field
              label="Mot de passe provisoire"
              required
              error={errors.password?.message}
              hint="12 caractères minimum, avec une majuscule, un chiffre et un caractère spécial."
            >
              <Input type="password" autoComplete="new-password" {...register('password')} />
            </Field>

            {create.isError && (
              <Alert tone="danger" role="alert">
                {getErrorMessage(create.error)}
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button type="submit" disabled={create.isPending}>
                Créer le salarié
              </Button>
            </div>
          </form>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardTitle>Et ensuite ?</CardTitle>
            <ol className="flex flex-col gap-3 text-sm">
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Transmettez le mot de passe provisoire au salarié.
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Il se connecte par email ou avec son compte Microsoft.
              </li>
              <li className="flex gap-2.5">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Il change son mot de passe depuis « Mon profil ».
              </li>
            </ol>
          </Card>
          <Alert tone="info">
            <Shield aria-hidden />
            <span>
              Un manager crée des employés dans sa branche. L'administrateur peut créer tous les rôles, dans
              toutes les branches.
            </span>
          </Alert>
        </aside>
      </div>
    </>
  );
}
