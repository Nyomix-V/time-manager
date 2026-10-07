import { Placeholder } from '@/components/ui';

export default function HoursScreen() {
  return (
    <Placeholder
      title="Mes heures"
      maquette="m03-mes-heures.html"
      items={[
        'Choix de la période : semaine, mois, personnalisée',
        'Total, moyenne par jour et par semaine, nombre de retards',
        'Détail jour par jour (arrivée, départ, pause, total)',
      ]}
    />
  );
}
