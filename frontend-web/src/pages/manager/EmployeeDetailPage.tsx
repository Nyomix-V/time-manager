import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Edit3, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { can, ROLE_LABELS } from '@/auth/permissions';
import { useDeleteUser, useUpdateUser, useUser } from '@/api/users';
import { useBranch, useBranches } from '@/api/branches';
import { useKpiReport } from '@/api/kpi';
import { getErrorMessage } from '@/api/client';
import type { User } from '@/api/types';
import { fullName } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { PeriodFilter } from '@/components/PeriodFilter';
import { usePeriod } from '@/hooks/usePeriod';
import { QueryState } from '@/components/QueryState';
import { KpiCard } from '@/components/KpiCard';
import { WorkHistory } from '@/components/hours/WorkHistory';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Field } from '@/components/Field';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogActions, DialogClose, DialogContent } from '@/components/ui/dialog';

/** Employee page (mockup 10): hours over a period, lateness, edit and delete. */
export function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const user = useUser(id);
  const period = usePeriod('month');
  const kpi = useKpiReport(period.range, { enabled: can(me.role, 'viewKpi') });
  const branch = useBranch(user.data?.branchId);
  const deleteUser = useDeleteUser();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listRoute = me.role === 'ADMIN' ? ROUTES.adminUsers : ROUTES.employees;

  return (
    <QueryState query={user}>
      {(u) => {
        const row = kpi.data?.rows.find((r) => r.userId === u.id);
        return (
          <>
            <PageHeader
              title={fullName(u)}
              breadcrumb={{ label: me.role === 'ADMIN' ? 'Utilisateurs' : 'Salariés', to: listRoute }}
              subtitle={
                <span className="flex flex-wrap items-center gap-x-2">
                  {ROLE_LABELS[u.role]}
                  {branch.data && ` · ${branch.data.name}`} · {u.email}
                  {u.phone && ` · ${u.phone}`}
                </span>
              }
            >
              <Avatar firstName={u.firstName} lastName={u.lastName} size="lg" className="order-first" />
              {row?.lateAlert && <Badge tone="warning">Seuil de retards dépassé</Badge>}
              <PeriodFilter period={period} />
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Edit3 aria-hidden />
                Modifier
              </Button>
              {can(me.role, 'deleteUser') && u.id !== me.id && (
                <Button
                  size="icon"
                  className="text-danger"
                  aria-label={`Supprimer ${fullName(u)}`}
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </PageHeader>

            {u.role === 'ADMIN' ? (
              <Alert tone="info">L'administrateur ne pointe pas : pas d'heures à afficher.</Alert>
            ) : (
              <WorkHistory
                userId={u.id}
                range={period.range}
                kind={period.kind}
                exportName={`heures-${u.lastName.toLowerCase()}`}
                extraKpi={
                  row && (
                    <KpiCard
                      label="Retards"
                      icon={AlertTriangle}
                      value={row.lateDays}
                      hint={row.lateAlert ? 'Seuil de 3 dépassé' : `Heures sup : ${row.overtimeHours} h`}
                      hintTone={row.lateAlert ? 'down' : 'muted'}
                    />
                  )
                }
              />
            )}

            <EditUserDialog
              user={u}
              open={editing}
              onClose={() => setEditing(false)}
              canChangeBranch={me.role === 'ADMIN'}
            />
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
});

function EditUserDialog({
  user,
  open,
  onClose,
  canChangeBranch,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
  canChangeBranch: boolean;
}) {
  const update = useUpdateUser(user.id);
  const branches = useBranches();
  const defaults = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? '',
    branchId: user.branchId ?? '',
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof editSchema>>({ resolver: zodResolver(editSchema), values: defaults });

  const close = () => {
    reset(defaults);
    update.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent icon={<Edit3 />} title={`Modifier ${fullName(user)}`}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(({ branchId, ...v }) =>
            update.mutate(
              { ...v, phone: v.phone || undefined, ...(canChangeBranch && branchId ? { branchId } : {}) },
              { onSuccess: close },
            ),
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required error={errors.firstName?.message}>
              <Input {...register('firstName')} />
            </Field>
            <Field label="Nom" required error={errors.lastName?.message}>
              <Input {...register('lastName')} />
            </Field>
          </div>
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
