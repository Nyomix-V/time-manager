import { useState, type ReactNode } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { Dialog, DialogActions, DialogClose, DialogContent } from './ui/dialog';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { Field } from './Field';
import { Input } from './ui/input';

const CONFIRM_WORD = 'SUPPRIMER';

/** Irreversible deletion: the user must type SUPPRIMER (mockups 11 and 13). */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Supprimer définitivement',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  const close = (o: boolean) => {
    if (!o) {
      setTyped('');
      setError(null);
    }
    onOpenChange(o);
  };

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      close(false);
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        role="alertdialog"
        tone="danger"
        icon={<Trash2 />}
        title={title}
        description={description}
      >
        <Alert tone="danger">
          <AlertTriangle aria-hidden />
          <span>
            Cette action est <strong>irréversible</strong>.
          </span>
        </Alert>
        <Field
          label={
            <>
              Pour confirmer, tapez <strong>{CONFIRM_WORD}</strong>
            </>
          }
        >
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
        {error !== null && (
          <p role="alert" className="text-sm text-danger">
            {getErrorMessage(error)}
          </p>
        )}
        <DialogActions>
          <DialogClose asChild>
            <Button variant="secondary">Annuler</Button>
          </DialogClose>
          <Button variant="danger" disabled={typed !== CONFIRM_WORD || pending} onClick={confirm}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
