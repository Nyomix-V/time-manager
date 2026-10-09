import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Calendar, Edit3, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { can, canManageUser, ROLE_LABELS } from '@/auth/permissions';
import { useDeleteUser, useUpdateUser, useUser } from '@/api/users';
import { useBranches } from '@/api/branches';
import { useTeams } from '@/api/teams';
import { useKpiReport } from '@/api/kpi';
import { getErrorMessage } from '@/api/client';
import type { Planning, User } from '@/api/types';
import { formatHours, fullName } from '@/lib/format';
import { describePlanning, parseDays } from '@/lib/planning';
import { PageHeader } from '@/components/PageHeader';
import { PeriodFilter } from '@/components/PeriodFilter';
import { usePeriod } from '@/hooks/usePeriod';
import { QueryState } from '@/components/QueryState';
import { KpiCard } from '@/components/KpiCard';
import { WorkHistory } from '@/components/hours/WorkHistory';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PlanningFields } from '@/components/users/PlanningFields';
import { UserStatusBadge } from '@/components/users/UserStatusBadge';
import { Field } from '@/components/Field';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogActions, DialogClose, DialogContent } from '@/components/ui/dialog';

/** Employee page (mockup 10): planning, hours over a period, lateness, edit and delete. */
export function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const user = useUser(id);
  const period = usePeriod('month');
  const kpi = useKpiReport(period.range, { enabled: can(me.role, 'viewKpi') });
  const deleteUser = useDeleteUser();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listRoute = me.role === 'ADMIN' ? ROUTES.adminUsers : ROUTES.employees;

  return (
    <QueryState query={user}>
      {(u) => {
        const row = kpi.data?.rows.find((r) => r.userId === u.id);
        const manageable = canManageUser(me, u) && u.id !== me.id;
        return (
          <>
            <PageHeader
              title={fullName(u)}
              breadcrumb={{ label: me.role === 'ADMIN' ? 'Utilisateurs' : 'Salariés', to: listRoute }}
              subtitle={
                <span className="flex flex-col gap-1">
                  <span>
                    {ROLE_LABELS[u.role]}
                    {u.team && ` · ${u.team.name}`}
                    {u.branch && ` · ${u.branch.name}`} · {u.email}
                    {u.phone && ` · ${u.phone}`}
                  </span>
                  {u.role !== 'ADMIN' && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-4" aria-hidden />
                      Planning : {describePlanning(u)}
                    </span>
                  )}
                </span>
              }
            >
              <Avatar firstName={u.firstName} lastName={u.lastName} size="lg" className="order-first" />
              <UserStatusBadge user={u} />
              {row?.lateAlert && <Badge tone="warning">Seuil de retards dépassé</Badge>}
              <PeriodFilter period={period} />
              {manageable && (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Edit3 aria-hidden />
                    Modifier
                  </Button>
                  <Button
                    size="icon"
                    className="text-danger"
                    aria-label={`Supprimer ${fullName(u)}`}
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </>
              )}
            </PageHeader>

            {u.role === 'ADMIN' ? (
              <Alert tone="info">L'administrateur ne pointe pas : pas d'heures à afficher.</Alert>
            ) : (
              <WorkHistory
                userId={u.id}
                range={period.range}
                kind={period.kind}
                planning={u}
                exportName={`heures-${u.lastName.toLowerCase()}`}
                extraKpi={
                  row && (
                    <KpiCard
                      label="Retards"
                      icon={AlertTriangle}
                      value={row.lateDays}
                      hint={
                        row.lateAlert
                          ? 'Seuil de 3 dépassé'
                          : `Heures sup : ${formatHours(row.overtimeHours)}`
                      }
                      hintTone={row.lateAlert ? 'down' : 'muted'}
                    />
                  )
                }
              />
            )}

            {editing && (
              <EditUserDialog
                user={u}
                onClose={() => setEditing(false)}
                canChangeBranch={me.role === 'ADMIN'}
              />
            )}
            <ConfirmDeleteDialog
              open={deleting}
              onOpenChange={setDeleting}
              title={`Supprimer ${fullName(u)} ?`}
              description="Son compte sera désactivé immédiatement et ses données personnelles supprimées (RGPD). Ses pointages sont conservés de façon anonyme pour les obligations légales."
              onConfirm={async () => {
                await deleteUser.mutateAsync(u.id);
                navigate(listRoute, { replace: true });
              }}
            />
          </>
        );
      }}
    </QueryState>
  );
}

const editSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.'),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.string().trim().email('Adresse email invalide.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 .-]{6,20})?$/, 'Numéro de téléphone invalide.'),
  branchId: z.string(),
  teamId: z.string(),
});

function EditUserDialog({
  user,
  onClose,
  canChangeBranch,
}: {
  user: User;
  onClose: () => void;
  canChangeBranch: boolean;
}) {
  const update = useUpdateUser(user.id);
  const branches = useBranches();
  const teams = useTeams(canChangeBranch ? (user.branchId ?? undefined) : undefined);
  const [planning, setPlanning] = useState<Planning>({
    workingDays: user.workingDays,
    expectedStartMin: user.expectedStartMin,
    workMinutesPerDay: user.workMinutesPerDay,
    breakMinutes: user.breakMinutes,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      branchId: user.branchId ?? '',
      teamId: user.teamId ?? '',
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" icon={<Edit3 />} title={`Modifier ${fullName(user)}`}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(({ branchId, teamId, phone, ...v }) => {
            if (user.role !== 'ADMIN' && parseDays(planning.workingDays).length === 0) return;
            update.mutate(
              {
                ...v,
                phone: phone || undefined,
                ...(teamId ? { teamId } : {}),
                ...(canChangeBranch && branchId ? { branchId } : {}),
                ...(user.role === 'ADMIN' ? {} : planning),
              },
              { onSuccess: onClose },
            );
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required error={errors.firstName?.message}>
              <Input {...register('firstName')} />
            </Field>
            <Field label="Nom" required error={errors.lastName?.message}>
              <Input {...register('lastName')} />
            </Field>
            <Field label="Adresse email" required error={errors.email?.message}>
              <Input type="email" {...register('email')} />
            </Field>
            <Field label="Téléphone" error={errors.phone?.message}>
              <Input type="tel" {...register('phone')} />
            </Field>
            {canChangeBranch && (
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
            )}
            {user.role !== 'ADMIN' && (
              <Field label="Équipe" hint="Pour retirer quelqu'un d'une équipe, passez par la page Équipes.">
                <Select {...register('teamId')}>
                  <option value="">Sans équipe</option>
                  {teams.data?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          {user.role !== 'ADMIN' && (
            <>
              <h3 className="text-sm font-semibold">Planning</h3>
              <PlanningFields value={planning} onChange={setPlanning} />
            </>
          )}
          {update.isError && (
            <Alert tone="danger" role="alert">
              {getErrorMessage(update.error)}
            </Alert>
          )}
          <DialogActions>
            <DialogClose asChild>
              <Button variant="secondary">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={update.isPending}>
              Enregistrer
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
