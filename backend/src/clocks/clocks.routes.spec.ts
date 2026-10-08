import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ClocksController, ClocksService } from './clocks.module';
import { Clock } from '../entities/clock.entity';
import { User } from '../entities/user.entity';
import { ClockType } from '../entities/enums';
import { FakeRepository } from '../testing/fake-repository';
import { createTestApp, seedUsers } from '../testing/test-app';

describe('Clocks routes', () => {
  let app: INestApplication;
  let users: FakeRepository<User>;
  let clocks: FakeRepository<Clock>;
  const as = (userId: string) => ({
    post: (url: string) => request(app.getHttpServer()).post(url).set('x-user', userId),
    get: (url: string) => request(app.getHttpServer()).get(url).set('x-user', userId),
  });

  beforeEach(async () => {
    users = seedUsers();
    clocks = new FakeRepository<Clock>();
    app = await createTestApp({
      controllers: [ClocksController],
      providers: [ClocksService],
      repositories: [[Clock, clocks], [User, users]],
      users,
    });
  });
  afterEach(() => app.close());

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/clocks/empA/status').expect(401);
  });

  it('lets an employee clock in for themselves', async () => {
    await as('empA').post('/clocks/empA/arrive').expect(201);
    const res = await as('empA').get('/clocks/empA/status').expect(200);
    expect(res.body.state).toBe('WORKING');
  });

  it('refuses to clock for someone else, even for their manager', async () => {
    const res = await as('mgrA').post('/clocks/empA/arrive').expect(403);
    expect(res.body.message).toBe('Vous ne pouvez pointer que pour vous-même');
    expect(clocks.rows).toHaveLength(0);
  });

  it('refuses a clock from the admin', async () => {
    const res = await as('admin').post('/clocks/admin/arrive').expect(400);
    expect(res.body.message).toBe("L'administrateur ne pointe pas");
  });

  it('follows the order arrival -> break -> end of break -> departure', async () => {
    const empA = as('empA');
    await empA.post('/clocks/empA/break/end').expect(400);
    await empA.post('/clocks/empA/depart').expect(400);
    await empA.post('/clocks/empA/arrive').expect(201);
    await empA.post('/clocks/empA/arrive').expect(400);
    await empA.post('/clocks/empA/break/start').expect(201);
    expect((await empA.get('/clocks/empA/status')).body.state).toBe('ON_BREAK');
    await empA.post('/clocks/empA/depart').expect(400);
    await empA.post('/clocks/empA/break/end').expect(201);
    await empA.post('/clocks/empA/depart').expect(201);
    expect((await empA.get('/clocks/empA/status')).body.state).toBe('OUT');
    // Back to work the same day ("Reprendre le travail").
    await empA.post('/clocks/empA/arrive').expect(201);
    expect(clocks.rows.map((c) => c.type)).toEqual(['IN', 'BREAK_START', 'BREAK_END', 'OUT', 'IN']);
  });

  it('explains why a clock is refused', async () => {
    await as('empA').post('/clocks/empA/arrive').expect(201);
    const res = await as('empA').post('/clocks/empA/arrive').expect(400);
    expect(res.body.message).toBe('Pointage impossible maintenant (dernier : IN, demandé : IN)');
  });

  it('does not block today because of a departure forgotten yesterday', async () => {
    clocks.seed({ userId: 'empA', type: ClockType.IN, time: new Date(Date.now() - 30 * 3_600_000) });
    const status = await as('empA').get('/clocks/empA/status').expect(200);
    expect(status.body.state).toBe('OUT');
    await as('empA').post('/clocks/empA/arrive').expect(201);
  });

  it("lets a manager read their branch's status only", async () => {
    await as('mgrA').get('/clocks/empA/status').expect(200);
    const res = await as('mgrA').get('/clocks/empB/status').expect(403);
    expect(res.body.message).toBe('Vous ne pouvez pas consulter cette personne');
    await as('admin').get('/clocks/empB/status').expect(200);
  });

  it("hides a colleague's clocks from an employee", async () => {
    await as('empA').get('/clocks/empA2').expect(403);
    await as('empA').get('/clocks/empA').expect(200);
  });

  it('answers 404 for an unknown user', async () => {
    const res = await as('admin').get('/clocks/nobody/status').expect(404);
    expect(res.body.message).toBe('Utilisateur introuvable');
  });

  it('filters the history by date and rejects an invalid date', async () => {
    clocks.seed(
      { userId: 'empA', type: ClockType.IN, time: new Date('2026-09-30T09:00:00+02:00') },
      { userId: 'empA', type: ClockType.IN, time: new Date('2026-10-01T09:00:00+02:00') },
      { userId: 'empA', type: ClockType.OUT, time: new Date('2026-10-01T17:00:00+02:00') },
      { userId: 'empA2', type: ClockType.IN, time: new Date('2026-10-01T09:00:00+02:00') },
    );
    const res = await as('empA')
      .get('/clocks/empA?from=2026-10-01T00:00:00%2B02:00&to=2026-10-01T23:59:59%2B02:00')
      .expect(200);
    expect(res.body.map((c: Clock) => c.type)).toEqual(['IN', 'OUT']);
    const bad = await as('empA').get('/clocks/empA?from=pas-une-date').expect(400);
    expect(bad.body.message).toBe('Date invalide : pas-une-date');
  });
});
