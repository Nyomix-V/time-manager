import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { endOfDay, setMilliseconds, startOfDay } from 'date-fns';
import { ChevronRight, Info } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { useCreateAbsence, useUserAbsences } from '@/api/absences';
import { getErrorMessage } from '@/api/client';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Field } from '@/components/Field';
import { Card, CardHead, CardTitle, FlushCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { DecisionBadge } from '@/components/absences/DecisionBadge';
import { ABSENCE_REASONS, formatAbsenceRange, splitReason } from '@/lib/absences';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    motif: z.enum(ABSENCE_REASONS, { errorMap: () => ({ message: 'Choisissez un motif.' }) }),
    from: z.string().min(1, 'Date de début obligatoire.'),
    to: z.string().min(1, 'Date de fin obligatoire.'),
    comment: z.string().max(500, '500 caractères maximum.').optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    path: ['to'],
    message: 'La date de fin doit être après la date de début.',
  });
type FormValues = z.infer<typeof schema>;

export function AbsencesPage() {
  const user = useCurrentUser();
  const absences = useUserAbsences(user.id);
  const create = useCreateAbsence(user.id);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { motif: 'Arrêt maladie' } });
  const motif = useWatch({ control, name: 'motif' });

  const onSubmit = (v: FormValues) => {
    setSent(false);
    create.mutate(
      {
        startDate: startOfDay(new Date(v.from)).toISOString(),
        // 23:59:59 and not .999: MySQL DATETIME rounds milliseconds up to the next day.
        endDate: setMilliseconds(endOfDay(new Date(v.to)), 0).toISOString(),
        reason: v.comment?.trim() ? `${v.motif} — ${v.comment.trim()}` : v.motif,
      },
      {
        onSuccess: () => {
          reset({ motif: v.motif, from: '', to: '', comment: '' });
          setSent(true);
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Absences"
        subtitle="Justifiez une absence ou un oubli de pointage. Votre manager la valide."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card aria-labelledby="new-title">
          <CardTitle id="new-title">Justifier une absence</CardTitle>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[13px] font-medium">
                Motif{' '}
                <span className="text-danger" aria-hidden>
                  *
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {ABSENCE_REASONS.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      'cursor-pointer rounded-full border border-border bg-white px-3.5 py-2 text-[13px] font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary',
                      motif === r && 'border-primary bg-primary-soft text-primary',
                    )}
                  >
                    <input type="radio" value={r} className="sr-only" {...register('motif')} />
                    {r}
                  </label>
                ))}
              </div>
              {errors.motif && (
                <span role="alert" className="text-xs text-danger">
                  {errors.motif.message}
                </span>
              )}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Du" required error={errors.from?.message}>
                <Input type="date" {...register('from')} />
              </Field>
              <Field label="Au" required error={errors.to?.message}>
                <Input type="date" {...register('to')} />
              </Field>
            </div>
            <Field label="Commentaire" error={errors.comment?.message}>
              <Textarea placeholder="Précisez si besoin (facultatif)…" {...register('comment')} />
            </Field>
            <Alert tone="info">
              <Info aria-hidden />
              <span>
                L'envoi de justificatif (PDF, JPG) arrivera avec la gestion des fichiers côté serveur. Pour un
                arrêt maladie, seul l'avis d'arrêt sera demandé : ne transmettez pas d'informations médicales.
              </span>
            </Alert>
            {create.isError && (
              <Alert tone="danger" role="alert">
                {getErrorMessage(create.error)}
              </Alert>
            )}
            {sent && (
              <Alert tone="success" role="status">
                Demande envoyée à votre manager.
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => reset()}>
                Annuler
              </Button>
              <Button type="submit" disabled={create.isPending}>
                Envoyer la demande
              </Button>
            </div>
          </form>
        </Card>

        <FlushCard aria-labelledby="mine-title">
          <CardHead>
            <div>
              <CardTitle id="mine-title">Mes demandes</CardTitle>
              <p className="mt-1 text-[13px] text-muted">Cliquez pour voir le détail</p>
            </div>
            {absences.data && <span className="text-xs text-muted">{absences.data.length} demandes</span>}
          </CardHead>
          <QueryState query={absences}>
            {(list) =>
              list.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">Aucune demande pour l'instant.</p>
              ) : (
                <ul>
                  {list.map((a) => {
                    const { motif: m, comment } = splitReason(a.reason);
                    return (
                      <li key={a.id} className="border-t border-border">
                        <details className="group">
                          <summary className="grid cursor-pointer list-none grid-cols-[1.3fr_1fr_auto_20px] items-center gap-3 px-5 py-3.5 text-sm group-open:bg-bg [&::-webkit-details-marker]:hidden">
                            <span>{m}</span>
                            <span className="text-muted">{formatAbsenceRange(a.startDate, a.endDate)}</span>
                            <DecisionBadge status={a.status} />
                            <ChevronRight
                              className="size-4 text-muted transition-transform group-open:rotate-90"
                              aria-hidden
                            />
                          </summary>
                          <div className="flex flex-col gap-2 bg-bg px-5 pb-4 pt-1 text-[13px]">
                            <p className="text-muted">Envoyée le {formatDateTime(a.createdAt)}</p>
                            {comment && <p>« {comment} »</p>}
                            {a.status === 'PENDING' && <p>Votre manager n'a pas encore répondu.</p>}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )
            }
          </QueryState>
        </FlushCard>
      </div>
    </>
  );
}
