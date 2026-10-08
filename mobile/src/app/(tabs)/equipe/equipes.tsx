import { useState } from 'react';

import { api } from '@/api';
import type { Team } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { Row, RowIcon, StateView } from '@/components/data';
import { TeamSheet } from '@/components/TeamSheet';
import { Button, Card, Screen } from '@/components/ui';
import { fullName } from '@/domain/labels';
import { useQuery } from '@/hooks/useQuery';

// Les équipes de la branche : création, modification, membres, suppression.
export default function TeamsScreen() {
  const session = useSession();
  const [editing, setEditing] = useState<Team | 'new' | null>(null);

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [teams, users] = await Promise.all([api.teams.list(), api.users.list()]);
    return {
      teams: teams.sort((a, b) => a.name.localeCompare(b.name)),
      people: users.filter((u) => u.role !== 'ADMIN' && u.branchId === session.branchId),
    };
  }, [session.branchId]);

  if (!data) {
    return (
      <Screen title="Équipes" safeTop={false}>
        <StateView loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const { teams, people } = data;
  const withoutTeam = people.filter((u) => !u.teamId && u.role === 'EMPLOYEE').length;
  const count = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

  return (
    <Screen title="Équipes" subtitle={count(teams.length, 'équipe')} safeTop={false} refreshing={refreshing} onRefresh={refresh}>
      <Button label="Nouvelle équipe" icon="plus" onPress={() => setEditing('new')} />

      <Card style={{ gap: 0 }}>
        {teams.length === 0 && <StateView loading={false} error={null} onRetry={reload} empty="Aucune équipe dans la branche." />}
        {teams.map((team, i) => {
          const manager = people.find((u) => u.id === team.managerId);
          return (
            <Row
              key={team.id}
              first={i === 0}
              left={<RowIcon name="users" />}
              title={team.name}
              subtitle={`${manager ? `Manager : ${fullName(manager)}` : 'Sans manager'} · ${count(people.filter((u) => u.teamId === team.id).length, 'membre')}`}
              onPress={() => setEditing(team)}
            />
          );
        })}
        {withoutTeam > 0 && <Row left={<RowIcon name="user-x" />} title="Sans équipe" subtitle={count(withoutTeam, 'employé')} />}
      </Card>

      {session.branchId && (
        <TeamSheet
          key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
          visible={editing !== null}
          team={editing === 'new' ? null : editing}
          teams={teams}
          people={people}
          branchId={session.branchId}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </Screen>
  );
}
