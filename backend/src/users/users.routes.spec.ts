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

  it('lets a manager register an employee of the branch, not a manager', async () => {
    const post = (userId: string, body: object) => request(app.getHttpServer()).post('/users').set('x-user', userId).send(body);
    const employee = { firstName: 'Léa', lastName: 'Nouvelle', email: 'lea.nouvelle@test.fr', role: 'EMPLOYEE', branchId: 'b1' };

    const res = await post('mgrA', employee).expect(201);
    expect(res.body).toMatchObject({ email: 'lea.nouvelle@test.fr', role: 'EMPLOYEE', activationToken: 'token' });

    const dup = await post('mgrA', { ...employee, firstName: 'Autre' }).expect(409);
    expect(dup.body.message).toBe('Cet email est déjà utilisé');
    await post('mgrA', { ...employee, email: 'chef@test.fr', role: 'MANAGER' }).expect(403);
    await post('mgrA', { ...employee, email: 'ailleurs@test.fr', branchId: 'b2' }).expect(403);
    await post('dirA', { ...employee, email: 'chef@test.fr', role: 'MANAGER' }).expect(201);
  });

  it('rejects fields that cannot be updated (role)', async () => {
    await as('dirA').put('/users/empA', { role: 'ADMIN' }).expect(400);
    expect(user('empA')?.role).toBe('EMPLOYEE');
  });
});
