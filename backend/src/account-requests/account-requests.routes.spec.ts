import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AccountRequestsController, AccountRequestsService } from './account-requests.module';
import { AccountRequest } from '../entities/account-request.entity';
import { User } from '../entities/user.entity';
import { RequestStatus } from '../entities/enums';
import { FakeRepository } from '../testing/fake-repository';
import { createTestApp, seedUsers } from '../testing/test-app';

describe('Account requests routes', () => {
  let app: INestApplication;
  let users: FakeRepository<User>;
  let requests: FakeRepository<AccountRequest>;
  const server = () => request(app.getHttpServer());
  const as = (userId: string) => ({
    get: (url: string) => server().get(url).set('x-user', userId),
    post: (url: string, body: object) => server().post(url).set('x-user', userId).send(body),
    patch: (url: string, body: object) => server().patch(url).set('x-user', userId).send(body),
  });
  const phoneChange = { type: 'INFO_CHANGE', field: 'phone', newValue: '0611223344' };

  beforeEach(async () => {
    users = seedUsers();
    requests = new FakeRepository<AccountRequest>(() => ({ status: RequestStatus.PENDING }));
    requests.relations = {
      user: { repo: users, key: 'userId' },
      decidedBy: { repo: users, key: 'decidedById' },
    };
    app = await createTestApp({
      controllers: [AccountRequestsController],
      providers: [AccountRequestsService],
      repositories: [[AccountRequest, requests], [User, users]],
      users,
    });
  });
  afterEach(() => app.close());

  it('allows a single pending request at a time', async () => {
    await as('empA').post('/account-requests', phoneChange).expect(201);
    const res = await as('empA').post('/account-requests', { type: 'DELETION' }).expect(400);
    expect(res.body.message).toBe('Vous avez déjà une demande en attente');
  });

  it('only accepts changes on the editable fields', async () => {
    for (const body of [
      { type: 'INFO_CHANGE', field: 'role', newValue: 'ADMIN' },
      { type: 'INFO_CHANGE', field: 'branchId', newValue: 'b2' },
      { type: 'INFO_CHANGE', field: 'phone', newValue: '  ' },
      { type: 'INFO_CHANGE' },
    ]) {
      const res = await as('empA').post('/account-requests', body).expect(400);
      expect(res.body.message).toBe('Demande de modification invalide');
    }
    expect(requests.rows).toHaveLength(0);
  });

  it('applies an approved phone change', async () => {
    const { id } = (await as('empA').post('/account-requests', phoneChange).expect(201)).body;
    await as('mgrA').patch(`/account-requests/${id}/decision`, { status: 'APPROVED' }).expect(200);
    expect(users.rows.find((u) => u.id === 'empA')?.phone).toBe('0611223344');
    // Decided -> the employee may send a new one.
    await as('empA').post('/account-requests', { type: 'DELETION' }).expect(201);
  });

  it('keeps the account when the deletion is refused, and removes it when approved', async () => {
    let { id } = (await as('empA').post('/account-requests', { type: 'DELETION' }).expect(201)).body;
    await as('mgrA').patch(`/account-requests/${id}/decision`, { status: 'REJECTED' }).expect(400);
    await as('mgrA')
      .patch(`/account-requests/${id}/decision`, { status: 'REJECTED', decisionComment: 'Contrat en cours' })
      .expect(200);
    expect(users.rows.find((u) => u.id === 'empA')?.deletedAt).toBeUndefined();

    ({ id } = (await as('empA').post('/account-requests', { type: 'DELETION' }).expect(201)).body);
    await as('mgrA').patch(`/account-requests/${id}/decision`, { status: 'APPROVED' }).expect(200);
    expect(users.rows.find((u) => u.id === 'empA')?.deletedAt).toBeInstanceOf(Date);
  });

  it('keeps decisions within the scope', async () => {
    const { id } = (await as('empA').post('/account-requests', phoneChange).expect(201)).body;
    await as('mgrB').patch(`/account-requests/${id}/decision`, { status: 'APPROVED' }).expect(403);
    await as('empA').patch(`/account-requests/${id}/decision`, { status: 'APPROVED' }).expect(403);
    expect(users.rows.find((u) => u.id === 'empA')?.phone).toBe('0600000000');

    expect((await as('mgrB').get('/account-requests/pending').expect(200)).body).toEqual([]);
    expect((await as('mgrA').get('/account-requests/pending').expect(200)).body).toHaveLength(1);
    await as('mgrB').get('/account-requests/user/empA').expect(403);
  });
});
