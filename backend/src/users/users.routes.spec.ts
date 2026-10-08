import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { User } from '../entities/user.entity';
import { FakeRepository } from '../testing/fake-repository';
import { createTestApp, seedUsers } from '../testing/test-app';

describe('Users routes', () => {
  let app: INestApplication;
  let users: FakeRepository<User>;
  const as = (userId: string) => ({
    get: (url: string) => request(app.getHttpServer()).get(url).set('x-user', userId),
    put: (url: string, body: object) => request(app.getHttpServer()).put(url).set('x-user', userId).send(body),
    delete: (url: string) => request(app.getHttpServer()).delete(url).set('x-user', userId),
  });
  const user = (id: string) => users.rows.find((u) => u.id === id);

  beforeEach(async () => {
    users = seedUsers();
    app = await createTestApp({
      controllers: [UsersController],
      providers: [UsersService, { provide: AuthService, useValue: { issueToken: async () => 'token' } }],
      repositories: [[User, users]],
      users,
    });
  });
  afterEach(() => app.close());

  it('lists the own branch only', async () => {
    const res = await as('mgrA').get('/users').expect(200);
    expect(res.body.map((u: User) => u.id).sort()).toEqual(['dirA', 'empA', 'empA2', 'mgrA']);
    await as('empA').get('/users').expect(403);
  });

  it('lets a manager update an employee of the branch, not a manager', async () => {
    await as('mgrA').put('/users/empA', { breakMinutes: 30 }).expect(200);
    expect(user('empA')?.breakMinutes).toBe(30);
    await as('mgrA').put('/users/dirA', { breakMinutes: 30 }).expect(403);
    await as('mgrA').put('/users/empB', { breakMinutes: 30 }).expect(403);
  });

  it('does not let a manager or directeur move someone to another branch', async () => {
    const res = await as('mgrA').put('/users/empA', { branchId: 'b2' }).expect(403);
    expect(res.body.message).toBe('Hors de votre branche');
    await as('dirA').put('/users/mgrA', { branchId: 'b2' }).expect(403);
    expect(user('empA')?.branchId).toBe('b1');
    await as('admin').put('/users/empA', { branchId: 'b2' }).expect(200);
    expect(user('empA')?.branchId).toBe('b2');
  });

  it('does not let anyone but the admin edit or delete their own account', async () => {
    await as('dirA').put('/users/dirA', { workMinutesPerDay: 60 }).expect(403);
    await as('dirA').delete('/users/dirA').expect(403);
    expect(user('dirA')?.deletedAt).toBeUndefined();
  });

  describe('on their own account (/users/me)', () => {
    const me = (userId: string) => ({
      put: (body: object) => request(app.getHttpServer()).put('/users/me').set('x-user', userId).send(body),
      delete: () => request(app.getHttpServer()).delete('/users/me').set('x-user', userId),
    });

    it('lets anyone edit their own information', async () => {
      const res = await me('empA').put({ firstName: ' Emma ', phone: '0611223344', email: 'Emma.A@Test.fr' }).expect(200);
      expect(res.body).toMatchObject({ id: 'empA', firstName: 'Emma', phone: '0611223344', email: 'emma.a@test.fr' });
      await me('empA').put({ phone: '' }).expect(200);
      expect(user('empA')?.phone).toBeNull();
      await me('dirA').put({ lastName: 'Directrice' }).expect(200);
    });

    it('never lets them change their role, team, branch or planning', async () => {
      for (const body of [{ role: 'ADMIN' }, { teamId: 'x' }, { branchId: 'b2' }, { expectedStartMin: 600 }]) {
        await me('empA').put(body).expect(400);
      }
      expect(user('empA')).toMatchObject({ role: 'EMPLOYEE', branchId: 'b1' });
    });

    it('refuses an email already used, or an empty name', async () => {
      const res = await me('empA').put({ email: 'MGRA@test.fr' }).expect(409);
      expect(res.body.message).toBe('Cet email est déjà utilisé');
      await me('empA').put({ email: 'empA@test.fr' }).expect(200); // their own, whatever the case
      const blank = await me('empA').put({ lastName: '   ' }).expect(400);
      expect(blank.body.message).toBe('Nom : obligatoire');
    });

    it('lets anyone delete their own account, except the admin', async () => {
      await me('empA').delete().expect(200);
      expect(user('empA')?.deletedAt).toBeInstanceOf(Date);
      const admin = await me('admin').delete().expect(400);
      expect(admin.body.message).toBe('Un administrateur ne peut pas supprimer son propre compte');
    });

    it('checks the email on a manager edit too', async () => {
      const res = await as('mgrA').put('/users/empA', { email: 'empA2@test.fr' }).expect(409);
      expect(res.body.message).toBe('Cet email est déjà utilisé');
    });
  });

  it('rejects fields that cannot be updated (role)', async () => {
    await as('dirA').put('/users/empA', { role: 'ADMIN' }).expect(400);
    expect(user('empA')?.role).toBe('EMPLOYEE');
  });
});
