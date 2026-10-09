import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus, Trash2, X } from 'lucide-react';
import { useDeleteTeam, useSaveTeam } from '@/api/teams';
import { getErrorMessage } from '@/api/client';
import type { Team, User } from '@/api/types';
import { fullName } from '@/lib/format';
import { Field } from '../Field';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { Avatar } from '../ui/avatar';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Input, Select } from '../ui/input';
import { Dialog, DialogActions, DialogClose, DialogContent } from '../ui/dialog';

const schema = z.object({
  name: z.string().trim().min(1, "Le nom de l'équipe est obligatoire."),
  description: z.string().optional(),
  managerId: z.string(),
});

/**
 * Create / edit a team (mockup 12): name, manager, members.
 * `users` = people of the team's branch (candidates for manager and members).
 */
export function TeamDialog({
  team,
  branchId,
  users,
  defaultManagerId,
  onClose,
}: {
  team: Team | null;
  branchId: string;
  users: User[];
  defaultManagerId?: string;
  onClose: () => void;
}) {
  const save = useSaveTeam();
  const remove = useDeleteTeam();
  const initialMembers = team?.members?.map((m) => m.id) ?? [];
  const [memberIds, setMemberIds] = useState<string[]>(initialMembers);
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
      managerId: team?.managerId ?? defaultManagerId ?? '',
    },
  });

  const managers = users.filter((u) => u.role === 'MANAGER' || u.role === 'DIRECTEUR');
  const byId = new Map(users.map((u) => [u.id, u]));
  const members = memberIds
    .map((id) => byId.get(id) ?? team?.members?.find((m) => m.id === id))
    .filter((u): u is User => !!u);
  const candidates = users
    .filter((u) => u.role !== 'ADMIN' && !memberIds.includes(u.id))
    .sort((a, b) => Number(!!a.teamId) - Number(!!b.teamId) || a.lastName.localeCompare(b.lastName));

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          size="lg"
          icon={team ? <Building2 /> : <Plus />}
          title={team ? team.name : 'Créer une équipe'}
          description={
            team ? `${members.length} membres` : 'Regroupez des salariés pour suivre leurs KPI ensemble.'
          }
        >
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((v) =>
              save.mutate(
                {
                  id: team?.id,
                  input: {
                    name: v.name,
                    description: v.description || undefined,
                    managerId: v.managerId || undefined,
                    branchId,
                  },
                  memberIds,
                  previousMemberIds: initialMembers,
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
                  className="min-h-[34px] w-72 py-1.5"
                  value=""
                  onChange={(e) => e.target.value && setMemberIds((ids) => [...ids, e.target.value])}
                >
                  <option value="">+ Ajouter un salarié…</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {fullName(u)}
                      {u.team ? ` (actuellement : ${u.team.name})` : ''}
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
