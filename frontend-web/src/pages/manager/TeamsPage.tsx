import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, ChevronRight, Info, Plus, Trash2, X } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { useDeleteTeam, useSaveTeam, useTeams } from '@/api/teams';
import { useUsers } from '@/api/users';
import { getErrorMessage } from '@/api/client';
import type { Team, User } from '@/api/types';
import { fullName } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Person } from '@/components/Person';
import { Field } from '@/components/Field';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Avatar } from '@/components/ui/avatar';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Dialog, DialogActions, DialogClose, DialogContent } from '@/components/ui/dialog';

/** Teams (mockup 12): cards, click to edit name / manager / members. */
export function TeamsPage() {
  const teams = useTeams();
  const users = useUsers();
  const [editing, setEditing] = useState<Team | 'new' | null>(null);
  const usersById = useMemo(() => new Map(users.data?.map((u) => [u.id, u])), [users.data]);
  const withoutTeam = (users.data ?? []).filter(
    (u) => u.role === 'EMPLOYEE' && !teams.data?.some((t) => t.memberIds.includes(u.id)),
  );

  return (
    <>
      <PageHeader title="Équipes" subtitle="Cliquez sur une équipe pour voir ses membres et la modifier.">
        <Button onClick={() => setEditing('new')} disabled={teams.isError}>
          <Plus aria-hidden />
          Créer une équipe
        </Button>
      </PageHeader>

      <QueryState query={teams}>
        {(list) => (
          <>
            {list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
                Aucune équipe pour l'instant.
              </p>
            ) : (
              <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {list.map((team) => (
                  <li key={team.id}>
                    <TeamCard team={team} usersById={usersById} onOpen={() => setEditing(team)} />
                  </li>
                ))}
              </ul>
            )}
            {withoutTeam.length > 0 && (
              <Alert tone="info">
                <Info aria-hidden />
                <span>
                  {withoutTeam.length} salarié{withoutTeam.length > 1 ? 's sont' : ' est'}{' '}
                  <strong>sans équipe</strong>. Ajoutez-les depuis la fenêtre d'une équipe.
                </span>
              </Alert>
            )}
          </>
        )}
      </QueryState>

      {editing && (
        <TeamDialog
          team={editing === 'new' ? null : editing}
          users={users.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function TeamCard({
  team,
  usersById,
  onOpen,
}: {
  team: Team;
  usersById: Map<string, User>;
  onOpen: () => void;
}) {
  const manager = team.managerId ? usersById.get(team.managerId) : undefined;
  const members = team.memberIds.map((id) => usersById.get(id)).filter((u): u is User => !!u);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer flex-col gap-4 rounded-lg border border-border bg-surface p-6 text-left hover:border-primary hover:shadow-[0_0_0_3px_var(--color-primary-soft)]"
    >
      <span className="flex items-center justify-between">
        <span className="text-lg font-semibold">{team.name}</span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </span>
      {team.description && <span className="text-sm text-muted">{team.description}</span>}
      {manager ? (
        <Person firstName={manager.firstName} lastName={manager.lastName} sub="Manager" />
      ) : (
        <span className="text-sm text-warning">Sans manager</span>
      )}
      <span className="flex items-center justify-between">
        <span className="flex">
          {members.slice(0, 4).map((m) => (
            <Avatar
              key={m.id}
              firstName={m.firstName}
              lastName={m.lastName}
              size="sm"
              className="-ml-2 border-2 border-white first:ml-0"
            />
          ))}
          {members.length > 4 && (
            <span className="-ml-2 grid size-8 place-items-center rounded-full border-2 border-white bg-bg text-[11px] font-semibold text-muted">
              +{members.length - 4}
            </span>
          )}
        </span>
        <span className="text-[13px] text-muted">
          {members.length} membre{members.length > 1 ? 's' : ''}
        </span>
      </span>
    </button>
  );
}

const schema = z.object({
  name: z.string().trim().min(1, "Le nom de l'équipe est obligatoire."),
  description: z.string().optional(),
  managerId: z.string(),
});

function TeamDialog({ team, users, onClose }: { team: Team | null; users: User[]; onClose: () => void }) {
  const me = useCurrentUser();
  const save = useSaveTeam();
  const remove = useDeleteTeam();
  const [memberIds, setMemberIds] = useState<string[]>(team?.memberIds ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: team?.name ?? '',
      description: team?.description ?? '',
      managerId: team?.managerId ?? (me.role === 'MANAGER' ? me.id : ''),
    },
  });

  const managers = users.filter((u) => u.role === 'MANAGER');
  const members = memberIds.map((id) => users.find((u) => u.id === id)).filter((u): u is User => !!u);
  const candidates = users.filter((u) => u.role === 'EMPLOYEE' && !memberIds.includes(u.id));

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          size="lg"
          icon={team ? <Building2 /> : <Plus />}
          title={team ? team.name : 'Créer une équipe'}
          description={
            team ? `${memberIds.length} membres` : 'Regroupez des salariés pour suivre leurs KPI ensemble.'
          }
        >
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((v) =>
              save.mutate(
                {
                  id: team?.id,
                  name: v.name,
                  description: v.description || null,
                  managerId: v.managerId || null,
                  branchId: team?.branchId ?? me.branchId ?? null,
                  memberIds,
                },
                { onSuccess: onClose },
              ),
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom de l'équipe" required error={errors.name?.message}>
                <Input placeholder="Ex. : Paie" {...register('name')} />
              </Field>
              <Field label="Manager">
                <Select {...register('managerId')}>
                  <option value="">Aucun</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {fullName(m)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Description">
              <Input placeholder="Facultatif…" {...register('description')} />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-medium">Membres ({members.length})</legend>
              <div className="flex justify-end">
                <Select
                  aria-label="Ajouter un salarié à l'équipe"
                  className="min-h-[34px] w-64 py-1.5"
                  value=""
                  onChange={(e) => e.target.value && setMemberIds((ids) => [...ids, e.target.value])}
                >
                  <option value="">+ Ajouter un salarié…</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {fullName(u)}
                    </option>
                  ))}
                </Select>
              </div>
              <ul className="max-h-64 overflow-y-auto">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2.5 border-t border-border py-2 text-sm first:border-t-0"
                  >
                    <Avatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                    <strong className="flex-1">{fullName(m)}</strong>
                    <Button
                      size="icon"
                      aria-label={`Retirer ${fullName(m)} de l'équipe`}
                      onClick={() => setMemberIds((ids) => ids.filter((id) => id !== m.id))}
                    >
                      <X aria-hidden />
                    </Button>
                  </li>
                ))}
                {members.length === 0 && <li className="py-2 text-sm text-muted">Aucun membre.</li>}
              </ul>
            </fieldset>

            {save.isError && (
              <Alert tone="danger" role="alert">
                {getErrorMessage(save.error)}
              </Alert>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {team ? (
                <Button
                  variant="ghost"
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 aria-hidden />
                  Supprimer l'équipe
                </Button>
              ) : (
                <span />
              )}
              <DialogActions>
                <DialogClose asChild>
                  <Button variant="secondary">Annuler</Button>
                </DialogClose>
                <Button type="submit" disabled={save.isPending}>
                  {team ? 'Enregistrer' : "Créer l'équipe"}
                </Button>
              </DialogActions>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {team && (
        <ConfirmDeleteDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Supprimer l'équipe ${team.name} ?`}
          description="Les membres ne sont pas supprimés : ils redeviennent « sans équipe »."
          confirmLabel="Supprimer l'équipe"
          onConfirm={async () => {
            await remove.mutateAsync(team.id);
            onClose();
          }}
        />
      )}
    </>
  );
}
