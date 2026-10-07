import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Edit3, Plus, Trash2 } from 'lucide-react';
import { useBranches, useDeleteBranch, useSaveBranch } from '@/api/branches';
import { useTeams } from '@/api/teams';
import { getErrorMessage } from '@/api/client';
import type { Branch } from '@/api/types';
import { fullName, minutesToTime, timeToMinutes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { QueryState, ErrorState } from '@/components/QueryState';
import { Field } from '@/components/Field';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Card, CardHead, CardTitle, FlushCard } from '@/components/ui/card';
import { Table, Td, Th, num } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogActions, DialogClose, DialogContent } from '@/components/ui/dialog';

/** Branches & teams (mockup 16). */
export function BranchesPage() {
  const branches = useBranches();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const remove = useDeleteBranch();

  return (
    <>
      <PageHeader
        title="Branches & équipes"
        subtitle="Organisation de l'entreprise : branches, équipes et managers responsables."
      >
        <Button onClick={() => setEditing('new')}>
          <Plus aria-hidden />
          Ajouter une branche
        </Button>
      </PageHeader>

      <QueryState query={branches}>
        {(list) => {
          const selected = list.find((b) => b.id === selectedId) ?? list[0];
          if (!selected) return <p className="text-sm text-muted">Aucune branche. Créez la première.</p>;
          return (
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <FlushCard aria-label="Branches" className="self-start">
                <ul>
                  {list.map((b) => {
                    const on = b.id === selected.id;
                    return (
                      <li key={b.id} className="border-t border-border first:border-t-0">
                        <button
                          type="button"
                          onClick={() => setSelectedId(b.id)}
                          aria-current={on ? 'true' : undefined}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left text-sm hover:bg-bg',
                            on && 'bg-primary-soft shadow-[inset_3px_0_0_var(--color-primary)]',
                          )}
                        >
                          <Building2
                            className={cn('size-5', on ? 'text-primary' : 'text-muted')}
                            aria-hidden
                          />
                          <span className="flex-1">
                            <strong className={cn(on && 'text-primary')}>{b.name}</strong>
                            <span className="block text-xs text-muted">{b.users?.length ?? 0} personnes</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </FlushCard>
              <BranchDetail
                branch={selected}
                onEdit={() => setEditing(selected)}
                onDelete={() => setDeleting(selected)}
              />
            </div>
          );
        }}
      </QueryState>

      {editing && (
        <BranchDialog branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Supprimer la branche ${deleting?.name ?? ''} ?`}
        description="Les personnes rattachées perdront leur branche. Pensez à les réaffecter avant."
        confirmLabel="Supprimer la branche"
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id);
          setSelectedId(null);
        }}
      />
    </>
  );
}

function BranchDetail({
  branch,
  onEdit,
  onDelete,
}: {
  branch: Branch;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const teams = useTeams();
  const users = branch.users ?? [];
  const managers = users.filter((u) => u.role === 'MANAGER');
  const branchTeams = teams.data?.filter((t) => t.branchId === branch.id) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{branch.name}</h2>
            {branch.description && <p className="text-sm text-muted">{branch.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEdit}>
              <Edit3 aria-hidden />
              Modifier
            </Button>
            <Button
              size="icon"
              className="text-danger"
              aria-label={`Supprimer la branche ${branch.name}`}
              onClick={onDelete}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Effectif" value={users.length} />
          <Stat label="Managers" value={managers.length} />
          <Stat label="Arrivée attendue" value={minutesToTime(branch.expectedStartMin)} />
          <Stat label="Équipes" value={teams.isSuccess ? branchTeams.length : '—'} />
        </dl>
      </Card>

      <FlushCard aria-labelledby="teams-title">
        <CardHead>
          <CardTitle id="teams-title">Équipes de la branche</CardTitle>
        </CardHead>
        {teams.isError ? (
          <div className="px-4 pb-4">
            <ErrorState error={teams.error} />
          </div>
        ) : branchTeams.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Aucune équipe dans cette branche.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Équipe</Th>
                <Th>Manager</Th>
                <Th className={num}>Membres</Th>
              </tr>
            </thead>
            <tbody>
              {branchTeams.map((t) => {
                const manager = users.find((u) => u.id === t.managerId);
                return (
                  <tr key={t.id}>
                    <Td>
                      <strong>{t.name}</strong>
                      {t.description && <div className="text-xs text-muted">{t.description}</div>}
                    </Td>
                    <Td>
                      {manager ? (
                        fullName(manager)
                      ) : (
                        <Badge tone="warning" dot={false}>
                          Sans manager
                        </Badge>
                      )}
                    </Td>
                    <Td className={num}>{t.memberIds.length}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </FlushCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
    </div>
  );
}

const schema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire.'),
  description: z.string().optional(),
  expectedStart: z.string().regex(/^\d{2}:\d{2}$/, 'Heure invalide.'),
});

function BranchDialog({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const save = useSaveBranch();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: branch?.name ?? '',
      description: branch?.description ?? '',
      expectedStart: minutesToTime(branch?.expectedStartMin ?? 540),
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent icon={<Building2 />} title={branch ? `Modifier ${branch.name}` : 'Ajouter une branche'}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) =>
            save.mutate(
              {
                id: branch?.id,
                name: v.name,
                description: v.description || undefined,
                expectedStartMin: timeToMinutes(v.expectedStart),
              },
              { onSuccess: onClose },
            ),
          )}
        >
          <Field label="Nom" required error={errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Description">
            <Input {...register('description')} />
          </Field>
          <Field
            label="Heure d'arrivée attendue"
            required
            error={errors.expectedStart?.message}
            hint="Au-delà, le pointage d'arrivée compte comme un retard."
          >
            <Input type="time" {...register('expectedStart')} />
          </Field>
          {save.isError && (
            <Alert tone="danger" role="alert">
              {getErrorMessage(save.error)}
            </Alert>
          )}
          <DialogActions>
            <DialogClose asChild>
              <Button variant="secondary">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={save.isPending}>
              Enregistrer
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
