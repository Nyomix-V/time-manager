import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-[26px] font-bold">Page introuvable</h1>
      <p className="text-sm text-muted">Cette page n'existe pas ou a été déplacée.</p>
      <Button asChild>
        <Link to="/">Retour à l'accueil</Link>
      </Button>
    </div>
  );
}
