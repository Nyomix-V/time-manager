import { Placeholder } from '@/components/ui';

export default function TeamScreen() {
  return (
    <Placeholder
      title="Mon équipe"
      maquette="m06-manager-equipe.html"
      items={[
        'Alerte de retards et KPI (moyenne hebdo, ponctualité) via GET /kpi/report',
        'Statut actuel de chaque salarié (en poste, en pause, absent), actualisé chaque minute',
        'Filtre : toutes les équipes, mes équipes, sans équipe',
        'Fiche salarié (m07-manager-salarie.html)',
      ]}
    />
  );
}
