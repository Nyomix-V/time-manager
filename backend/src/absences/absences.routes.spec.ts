import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AbsencesController, AbsencesService } from './absences.module';
import { Absence } from '../entities/absence.entity';
import { User } from '../entities/user.entity';
import { RequestStatus } from '../entities/enums';
import { FakeRepository } from '../testing/fake-repository';
import { createTestApp, seedUsers } from '../testing/test-app';

describe('Absences routes', () => {
  let app: INestApplication;
  let users: FakeRepository<User>;
  let absences: FakeRepository<Absence>;
  const server = () => request(app.getHttpServer());
  const as = (userId: string) => ({
    get: (url: string) => server().get(url).set('x-user', userId),
    post: (url: string, body: object) => server().post(url).set('x-user', userId).send(body),
    patch: (url: string, body: object) => server().patch(url).set('x-user', userId).send(body),
  });
  const medical = {
    type: 'MEDICAL',
    startDate: '2026-10-05T08:00:00+02:00',
    endDate: '2026-10-05T12:00:00+02:00',
    comment: 'Rendez-vous médical',
  };
  const file = async (userId: string) => (await as(userId).post('/absences', medical).expect(201)).body as Absence;

  beforeEach(async () => {
    users = seedUsers();
    absences = new FakeRepository<Absence>(() => ({ status: RequestStatus.PENDING }));
    absences.relations = {
      user: { repo: users, key: 'userId' },
      decidedBy: { repo: users, key: 'decidedById' },
    };
    app = await createTestApp({
      controllers: [AbsencesController],
      providers: [AbsencesService],
      repositories: [[Absence, absences], [User, users]],
      users,
    });
  });
  afterEach(() => app.close());

  it('files the absence for the logged-in user, pending', async () => {
    const absence = await file('empA');
    expect(absence.userId).toBe('empA');
    expect(absence.status).toBe('PENDING');
  });

  it('rejects an end date before the start date', async () => {
    const res = await as('empA')
      .post('/absences', { ...medical, endDate: '2026-10-04T12:00:00+02:00' })
      .expect(400);
    expect(res.body.message).toBe('La date de fin est avant la date de début');
  });

  it('rejects fields the employee may not set (no self-approval)', async () => {
    await as('empA').post('/absences', { ...medical, status: 'APPROVED' }).expect(400);
    await as('empA').post('/absences', { ...medical, userId: 'empA2' }).expect(400);
    expect(absences.rows).toHaveLength(0);
  });

  it('lists only the requests the actor may decide', async () => {
    await file('empA');
    await file('mgrA');
    await file('empB');
    await file('empA2');
    const ids = async (userId: string) =>
      (await as(userId).get('/absences/pending').expect(200)).body.map((a: any) => a.user.id).sort();

    expect(await ids('mgrA')).toEqual(['empA', 'empA2']); // not themselves, not the other branch
    expect(await ids('dirA')).toEqual(['empA', 'empA2', 'mgrA']); // managers included
    expect(await ids('mgrB')).toEqual(['empB']);
    expect(await ids('admin')).toEqual(['empA', 'empA2', 'empB', 'mgrA']);
    await as('empA').get('/absences/pending').expect(403);

    const [first] = (await as('mgrA').get('/absences/pending')).body;
    expect(Object.keys(first.user).sort()).toEqual(['firstName', 'id', 'lastName', 'phone', 'role', 'teamId']);
  });

  it('requires a reason to refuse', async () => {
    const { id } = await file('empA');
    let res = await as('mgrA').patch(`/absences/${id}/decision`, { status: 'REJECTED' }).expect(400);
    expect(res.body.message).toBe('Le motif du refus est obligatoire');
    await as('mgrA').patch(`/absences/${id}/decision`, { status: 'REJECTED', decisionComment: '   ' }).expect(400);
    res = await as('mgrA')
      .patch(`/absences/${id}/decision`, { status: 'REJECTED', decisionComment: 'Pas de justificatif' })
      .expect(200);
    expect(res.body).toMatchObject({ status: 'REJECTED', decisionComment: 'Pas de justificatif', decidedById: 'mgrA' });
  });

  it('refuses a decision outside the scope', async () => {
    const { id } = await file('empA');
    const res = await as('mgrB').patch(`/absences/${id}/decision`, { status: 'APPROVED' }).expect(403);
    expect(res.body.message).toBe('Cette demande ne relève pas de vous');
    await as('empA2').patch(`/absences/${id}/decision`, { status: 'APPROVED' }).expect(403);

    const own = await file('mgrA');
    await as('mgrA').patch(`/absences/${own.id}/decision`, { status: 'APPROVED' }).expect(403);
    await as('dirA').patch(`/absences/${own.id}/decision`, { status: 'APPROVED' }).expect(200);
    expect(absences.rows.find((a) => a.id === id)?.status).toBe('PENDING');
  });

  it('rejects an unknown decision status', async () => {
    const { id } = await file('empA');
    await as('mgrA').patch(`/absences/${id}/decision`, { status: 'PENDING' }).expect(400);
  });

  it('decides only once and tells the employee who decided', async () => {
    const { id } = await file('empA');
    const res = await as('mgrA').patch(`/absences/${id}/decision`, { status: 'APPROVED' }).expect(200);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body).not.toHaveProperty('user');

    const again = await as('dirA')
      .patch(`/absences/${id}/decision`, { status: 'REJECTED', decisionComment: 'Non' })
      .expect(400);
    expect(again.body.message).toBe('Cette demande a déjà été traitée');

    const history = await as('empA').get('/absences/user/empA').expect(200);
    expect(history.body[0].decidedBy).toEqual({ id: 'mgrA', firstName: 'mgrA', lastName: 'Test' });
  });

  it("hides an employee's history outside the branch", async () => {
    await file('empA');
    await as('mgrA').get('/absences/user/empA').expect(200);
    await as('mgrB').get('/absences/user/empA').expect(403);
    await as('empA2').get('/absences/user/empA').expect(403);
  });
});
