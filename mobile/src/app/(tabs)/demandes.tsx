import { Placeholder } from '@/components/ui';

export default function RequestsScreen() {
  return (
    <Placeholder
      title="Demandes"
      maquette="m08-demandes.html"
      items={[
        'Absences, modifications d’informations et suppressions de compte en attente',
        'Valider (commentaire facultatif) ou refuser (motif obligatoire) — PATCH /absences/:id/decision',
        'Nombre de demandes en attente affiché sur l’onglet',
      ]}
    />
  );
}
