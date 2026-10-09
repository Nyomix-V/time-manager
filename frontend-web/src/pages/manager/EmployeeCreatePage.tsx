import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, Lock, Shield } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { creatableRoles, ROLE_LABELS } from '@/auth/permissions';
import { useCreateUser } from '@/api/users';
import { useBranches } from '@/api/branches';
import { useTeams } from '@/api/teams';
import { getErrorMessage } from '@/api/client';
import type { CreatedUser, Planning, Role } from '@/api/types';
import { fullName } from '@/lib/format';
import { DEFAULT_PLANNING, parseDays } from '@/lib/planning';
import { PageHeader } from '@/components/PageHeader';
import { Field, ReadOnlyField } from '@/components/Field';
import { PlanningFields } from '@/components/users/PlanningFields';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.'),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.string().trim().min(1, "L'email est obligatoire.").email('Adresse email invalide.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 .-]{6,20})?$/, 'Numéro de téléphone invalide.')
    .optional(),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'DIRECTEUR', 'ADMIN']),
  branchId: z.string(),
  teamId: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** New employee (mockup 09): identity, assignment, planning. The person then activates the account. */
export function EmployeeCreatePage() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const create = useCreateUser();
  const isAdmin = me.role === 'ADMIN';
  const roles = creatableRoles(me.role);
  const branches = useBranches();
  const [planning, setPlanning] = useState<Planning>(DEFAULT_PLANNING);
  const [created, setCreated] = useState<CreatedUser | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'EMPLOYEE', branchId: me.branchId ?? '', teamId: '' },
  });
  const branchId = useWatch({ control, name: 'branchId' });
  const role = useWatch({ control, name: 'role' });
  const teams = useTeams(isAdmin ? branchId || undefined : undefined);
  const listRoute = isAdmin ? ROUTES.adminUsers : ROUTES.employees;

  const onSubmit = (v: FormValues) => {
    if (role !== 'ADMIN' && parseDays(planning.workingDays).length === 0) return;
    create.mutate(
      {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || undefined,
        role: v.role,
        // Manager / directeur: always their own branch (checked again by the backend).
        branchId: (isAdmin ? v.branchId : me.branchId) || undefined,
        teamId: v.teamId || undefined,
        ...(v.role === 'ADMIN' ? {} : planning),
      },
      { onSuccess: setCreated },
    );
  };

  if (created) return <CreatedScreen user={created} listRoute={listRoute} />;

  return (
    <>
      <PageHeader
        title="Ajouter un salarié"
        breadcrumb={{ label: isAdmin ? 'Utilisateurs' : 'Salariés', to: listRoute }}
        subtitle="Le salarié reçoit un lien pour activer son compte et choisir son mot de passe."
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
            <div className="grid gap-4 sm:grid-cols-3">
              {roles.length > 1 ? (
                <Field label="Rôle" required>
                  <Select {...register('role')}>
                    {roles.map((r: Role) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <ReadOnlyField label="Rôle" value={ROLE_LABELS[roles[0]]} />
              )}
              {isAdmin ? (
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
              ) : (
                <ReadOnlyField
                  label="Branche"
                  icon={<Lock aria-hidden />}
                  value={me.branch ? `${me.branch.name} (votre branche)` : '—'}
                />
              )}
              <Field label="Équipe">
                <Select {...register('teamId')} disabled={!teams.data?.length}>
                  <option value="">Sans équipe</option>
                  {teams.data?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {role !== 'ADMIN' && (
              <>
                <h2 className="mt-1 text-base font-semibold">Planning</h2>
                <PlanningFields value={planning} onChange={setPlanning} />
              </>
            )}

            {create.isError && (
              <Alert tone="danger" role="alert">
                {getErrorMessage(create.error)}
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate(listRoute)}>
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
              <li>
                <strong className="block">1. Création du compte</strong>
                <span className="text-xs text-muted">
                  Le compte est « invité » tant qu'il n'est pas activé.
                </span>
              </li>
              <li>
                <strong className="block">2. Lien d'activation</strong>
                <span className="text-xs text-muted">Valable 48 h, pour choisir un mot de passe.</span>
              </li>
              <li>
                <strong className="block">3. Première connexion</strong>
                <span className="text-xs text-muted">Par email et mot de passe, ou avec Microsoft.</span>
              </li>
            </ol>
          </Card>
          <Alert tone="info">
            <Shield aria-hidden />
            <span>
              Un manager crée des employés dans sa branche. Le directeur peut aussi créer des managers ;
              l'administrateur, tous les rôles dans toutes les branches.
            </span>
          </Alert>
        </aside>
      </div>
    </>
  );
}

/** After creation: the activation link to pass on (no email is sent by the backend yet). */
function CreatedScreen({ user, listRoute }: { user: CreatedUser; listRoute: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${ROUTES.activate}?token=${encodeURIComponent(user.activationToken)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <PageHeader title="Salarié créé" breadcrumb={{ label: 'Salariés', to: listRoute }} />
      <Card className="max-w-2xl">
        <Alert tone="success" role="status">
          <Check aria-hidden />
          <span>
            Le compte de <strong>{fullName(user)}</strong> est créé. Il sera actif quand la personne aura
            choisi son mot de passe.
          </span>
        </Alert>
        <Field
          label="Lien d'activation à transmettre (valable 48 h)"
          hint="L'envoi automatique par email n'est pas encore en place."
        >
          <Input readOnly value={link} onFocus={(e) => e.target.select()} />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? 'Lien copié' : 'Copier le lien'}
          </Button>
          <Button asChild>
            <Link to={ROUTES.employee(user.id)}>Voir la fiche</Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
