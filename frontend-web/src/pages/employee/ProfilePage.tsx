import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Edit3, Lock, Mail, Phone, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { useBranch } from '@/api/branches';
import { useCreateRequest, useMyRequests } from '@/api/requests';
import { changePassword } from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import type { EditableField, User } from '@/api/types';
import { ROLE_LABELS } from '@/auth/permissions';
import { formatDateShort, minutesToTime } from '@/lib/format';
import { passwordSchema, passwordStrength } from '@/lib/password';
import { PageHeader } from '@/components/PageHeader';
import { Field, ReadOnlyField } from '@/components/Field';
import { Card, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogActions, DialogClose, DialogContent } from '@/components/ui/dialog';

const FIELD_LABELS: Record<EditableField, string> = {
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'Adresse email',
  phone: 'Téléphone',
};

export function ProfilePage() {
  const user = useCurrentUser();
  const branch = useBranch(user.branchId);
  const myRequests = useMyRequests();
  const pending = myRequests.data?.find((r) => r.status === 'PENDING');
  const [modal, setModal] = useState<'update' | 'delete' | null>(null);

  return (
    <>
      <PageHeader
        title="Mon profil"
        subtitle="Consultez vos informations et gérez la sécurité de votre compte."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card aria-labelledby="info-title">
          <div className="flex items-center gap-4">
            <Avatar firstName={user.firstName} lastName={user.lastName} size="lg" />
            <div className="flex-1">
              <CardTitle id="info-title">Informations personnelles</CardTitle>
              <p className="text-[13px] text-muted">
                Gérées par votre manager, votre directeur ou un administrateur.
              </p>
            </div>
            <Badge tone="neutral">
              <Lock className="size-3" aria-hidden />
              Lecture seule
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Prénom" value={user.firstName} />
            <ReadOnlyField label="Nom" value={user.lastName} />
          </div>
          <ReadOnlyField label="Adresse email" value={user.email} icon={<Mail aria-hidden />} />
          <ReadOnlyField label="Téléphone" value={user.phone} icon={<Phone aria-hidden />} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Branche" value={branch.data?.name} />
            <ReadOnlyField label="Rôle" value={ROLE_LABELS[user.role]} />
          </div>
          {pending && (
            <Alert tone="warning" role="status">
              <Clock aria-hidden />
              <span>
                <strong>Demande en attente</strong> ·{' '}
                {pending.type === 'DELETE'
                  ? 'suppression du compte'
                  : `${FIELD_LABELS[pending.field!]} → ${pending.newValue}`}
                , envoyée le {formatDateShort(pending.createdAt)}. Vous pourrez en faire une nouvelle dès
                qu'elle sera acceptée ou refusée.
              </span>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button
              onClick={() => setModal('update')}
              disabled={!!pending}
              title={pending ? 'Une demande est déjà en attente' : undefined}
            >
              <Edit3 aria-hidden />
              Demander une modification
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          {user.role !== 'ADMIN' && (
            <Card aria-labelledby="plan-title">
              <div>
                <CardTitle id="plan-title">Mon planning</CardTitle>
                <p className="text-[13px] text-muted">Défini par votre branche.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <PlanningItem
                  label="Arrivée prévue"
                  value={branch.data ? minutesToTime(branch.data.expectedStartMin) : '—'}
                />
              </div>
              <p className="text-xs text-muted">
                Le planning individuel (jours travaillés, durée, pause) sera disponible quand le serveur le
                gérera.
              </p>
            </Card>
          )}
          <PasswordCard />
        </div>
      </div>

      <Card className="border-[#ffc9c9]" aria-labelledby="del-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-3xl">
            <CardTitle id="del-title">Supprimer mon compte</CardTitle>
            <p className="mt-1 text-[13px] text-muted">
              La suppression est validée par votre manager. Vos données personnelles sont alors supprimées
              (RGPD) ; vos pointages sont conservés de façon anonyme pour les obligations légales.
            </p>
            {pending && (
              <p className="mt-1.5 text-xs text-muted">
                Indisponible : une demande est déjà en attente de réponse.
              </p>
            )}
          </div>
          <Button variant="danger" onClick={() => setModal('delete')} disabled={!!pending}>
            <Trash2 aria-hidden />
            Demander la suppression
          </Button>
        </div>
      </Card>

      <UpdateRequestDialog user={user} open={modal === 'update'} onClose={() => setModal(null)} />
      <DeleteRequestDialog open={modal === 'delete'} onClose={() => setModal(null)} />
    </>
  );
}

function PlanningItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted">
      {label}
      <strong className="text-base text-text">{value}</strong>
    </div>
  );
}

const updateSchema = z.object({
  field: z.enum(['firstName', 'lastName', 'email', 'phone']),
  newValue: z.string().trim().min(1, 'La nouvelle valeur est obligatoire.'),
  comment: z.string().optional(),
});

function UpdateRequestDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const create = useCreateRequest();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: { field: 'phone' },
  });
  const field = useWatch({ control, name: 'field' });

  const close = () => {
    reset();
    create.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        icon={<Edit3 />}
        title="Demander une modification"
        description="Votre manager la valide ou la refuse. Une seule demande à la fois : vous pourrez en faire une autre après sa réponse."
      >
        <form
          className="flex flex-col gap-[18px]"
          noValidate
          onSubmit={handleSubmit((v) => create.mutate({ type: 'UPDATE', ...v }, { onSuccess: close }))}
        >
          <Field label="Information à modifier" required>
            <Select {...register('field')}>
              {(Object.keys(FIELD_LABELS) as EditableField[]).map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Valeur actuelle" value={user[field]} />
            <Field label="Nouvelle valeur" required error={errors.newValue?.message}>
              <Input {...register('newValue')} />
            </Field>
          </div>
          <Field label="Commentaire">
            <Textarea className="min-h-[70px]" placeholder="Facultatif…" {...register('comment')} />
          </Field>
          {create.isError && (
            <Alert tone="danger" role="alert">
              {getErrorMessage(create.error)}
            </Alert>
          )}
          <DialogActions>
            <DialogClose asChild>
              <Button variant="secondary">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={create.isPending}>
              Envoyer la demande
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DELETE_REASONS = ["Départ de l'entreprise", 'Fin de contrat', 'Autre'];

function DeleteRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateRequest();
  const [reason, setReason] = useState(DELETE_REASONS[0]);
  const close = () => {
    create.reset();
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        role="alertdialog"
        tone="danger"
        icon={<Trash2 />}
        title="Demander la suppression de mon compte"
        description="Votre manager recevra la demande. En attendant sa réponse, vous ne pourrez pas faire d'autre demande."
      >
        <Field label="Motif">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {DELETE_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Alert tone="danger">
          <span>
            Une fois validée, la suppression est <strong>irréversible</strong>.
          </span>
        </Alert>
        {create.isError && (
          <Alert tone="danger" role="alert">
            {getErrorMessage(create.error)}
          </Alert>
        )}
        <DialogActions>
          <DialogClose asChild>
            <Button variant="secondary">Annuler</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={create.isPending}
            onClick={() => create.mutate({ type: 'DELETE', comment: reason }, { onSuccess: close })}
          >
            Envoyer la demande
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

const pwdForm = z
  .object({
    current: z.string().min(1, 'Mot de passe actuel obligatoire.'),
    next: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ['confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  });

function PasswordCard() {
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof pwdForm>>({ resolver: zodResolver(pwdForm) });
  const strength = passwordStrength(useWatch({ control, name: 'next' }) ?? '');

  const onSubmit = async (v: z.infer<typeof pwdForm>) => {
    setStatus(null);
    try {
      await changePassword(v.current, v.next);
      reset();
      setStatus({ ok: true, msg: 'Mot de passe mis à jour.' });
    } catch (e) {
      setStatus({ ok: false, msg: getErrorMessage(e) });
    }
  };

  return (
    <Card aria-labelledby="sec-title">
      <div>
        <CardTitle id="sec-title">Sécurité</CardTitle>
        <p className="text-[13px] text-muted">
          12 caractères minimum, avec une majuscule, un chiffre et un caractère spécial.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Mot de passe actuel" error={errors.current?.message}>
          <Input type="password" autoComplete="current-password" {...register('current')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nouveau mot de passe" error={errors.next?.message}>
            <Input type="password" autoComplete="new-password" {...register('next')} />
          </Field>
          <Field label="Confirmer" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirm')} />
          </Field>
        </div>
        {status && (
          <Alert tone={status.ok ? 'success' : 'danger'} role={status.ok ? 'status' : 'alert'}>
            {status.msg}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex max-w-60 flex-1 items-center gap-2">
            <Progress
              className="flex-1"
              label={`Robustesse : ${strength.label}`}
              value={strength.score * 25}
              tone={strength.score >= 4 ? 'ok' : strength.score >= 2 ? 'warn' : 'bad'}
            />
            <span className="text-xs text-muted">{strength.label}</span>
          </div>
          <Button type="submit" variant="secondary" disabled={isSubmitting}>
            Mettre à jour le mot de passe
          </Button>
        </div>
      </form>
    </Card>
  );
}
