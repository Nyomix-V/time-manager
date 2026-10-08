import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TeamsController, TeamsService } from './teams.module';
import { Team } from '../entities/team.entity';
import { User } from '../entities/user.entity';
import { FakeRepository } from '../testing/fake-repository';
import { createTestApp, seedUsers } from '../testing/test-app';

describe('Teams routes', () => {
  let app: INestApplication;
  let users: FakeRepository<User>;
  const get = (url: string, userId: string) => request(app.getHttpServer()).get(url).set('x-user', userId);
  const post = (url: string, userId: string) => request(app.getHttpServer()).post(url).set('x-user', userId);
  const del = (url: string, userId: string) => request(app.getHttpServer()).delete(url).set('x-user', userId);

  beforeEach(async () => {
    users = seedUsers();
    const teams = new FakeRepository<Team>().seed(
      { id: 'teamA', name: 'Accueil', branchId: 'b1' },
      { id: 'teamB', name: 'Cuisine', branchId: 'b2' },
    );
    app = await createTestApp({
      controllers: [TeamsController],
      providers: [TeamsService],
      repositories: [[Team, teams], [User, users]],
      users,
    });
  });
  afterEach(() => app.close());

  it('lists the teams of the own branch only', async () => {
    const res = await get('/teams', 'mgrA').expect(200);
    expect(res.body.map((t: Team) => t.id)).toEqual(['teamA']);
  });

  it('refuses to open a team of another branch', async () => {
    await get('/teams/teamA', 'empA').expect(200);
    const res = await get('/teams/teamB', 'mgrA').expect(403);
    expect(res.body.message).toBe('Hors de votre branche');
    await get('/teams/teamB', 'admin').expect(200);
  });

  it('only adds members of the team branch', async () => {
    const res = await post('/teams/teamA/members/empB', 'admin').expect(400);
    expect(res.body.message).toBe("Cette personne n'appartient pas à la branche de l'équipe");
    await post('/teams/teamA/members/empA', 'mgrA').expect(201);
    expect(users.rows.find((u) => u.id === 'empA')?.teamId).toBe('teamA');
    await post('/teams/teamB/members/empA', 'mgrA').expect(403);
  });

  it('only removes a member from their own team', async () => {
    users.rows.find((u) => u.id === 'empB')!.teamId = 'teamB';
    users.rows.find((u) => u.id === 'empA')!.teamId = 'teamA';
    // Manager of b1 through their own team id, targeting someone of b2.
    const res = await del('/teams/teamA/members/empB', 'mgrA').expect(404);
    expect(res.body.message).toBe("Cette personne n'est pas dans l'équipe");
    expect(users.rows.find((u) => u.id === 'empB')?.teamId).toBe('teamB');
    await del('/teams/teamA/members/empA', 'mgrA').expect(200);
    expect(users.rows.find((u) => u.id === 'empA')?.teamId).toBeNull();
  });

  it('answers 404 in French for an unknown team', async () => {
    const res = await get('/teams/nope', 'admin').expect(404);
    expect(res.body.message).toBe('Équipe introuvable');
  });
});
