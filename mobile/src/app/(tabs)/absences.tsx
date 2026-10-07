import { Placeholder } from '@/components/ui';

export default function AbsencesScreen() {
  return (
    <Placeholder
      title="Absences"
      maquette="m04-absence.html"
      items={[
        'Bascule « Nouvelle demande » / « Historique »',
        'Formulaire : motif, dates, commentaire, justificatif (POST /absences)',
        'Historique des 12 derniers mois, réponse du manager au clic, « Tout voir »',
      ]}
    />
  );
}
