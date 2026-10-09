import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { UserToken } from '../entities/user-token.entity';
import { FakeRepository } from '../testing/fake-repository';
import { createTestApp, seedUsers } from '../testing/test-app';

// Microsoft SSO and password reset. Microsoft itself is replaced by a fake `fetch`.
describe('Auth routes', () => {
  let app: INestApplication;
  let users: FakeRepository<User>;
  const jwt = new JwtService({ secret: 'test-secret' });
  const env = { ...process.env };
  const server = () => request(app.getHttpServer());

  // id_token as Microsoft returns it (only the payload is read: it comes straight from Microsoft over TLS).
  const idToken = (claims: object) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
  const microsoftAnswers = (body: object, ok = true) => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 400, json: async () => body });
  };
  const location = (res: request.Response) => String(res.headers.location);
  const query = (url: string) => new URLSearchParams(url.split('?')[1]);

  beforeEach(async () => {
    process.env.MS_CLIENT_ID = 'client-test';
    process.env.MS_CLIENT_SECRET = 'secret-test';
    delete process.env.FRONTEND_URL;
    delete process.env.MOBILE_SSO_REDIRECT;
    users = seedUsers();
    app = await createTestApp({
      controllers: [AuthController],
      providers: [AuthService, { provide: JwtService, useValue: jwt }],
      repositories: [[User, users], [UserToken, new FakeRepository<UserToken>()]],
      users,
    });
  });
  afterEach(async () => {
    await app.close();
    process.env = { ...env };
    delete (globalThis as any).fetch;
  });

  describe('Microsoft sign-in', () => {
    it('sends the user to Microsoft, remembering which client asked', async () => {
      const mobile = await server().get('/auth/microsoft?client=mobile').expect(302);
      expect(location(mobile)).toMatch(/^https:\/\/login\.microsoftonline\.com\/common\/oauth2\/v2\.0\/authorize\?/);
      expect(query(location(mobile)).get('state')).toMatch(/^mobile\.[0-9a-f]{16}$/);
      expect(query(location(mobile)).get('client_id')).toBe('client-test');

      const web = await server().get('/auth/microsoft').expect(302);
      expect(query(location(web)).get('state')).toMatch(/^web\./);
    });

    it('sends the app back with a message when SSO is not configured', async () => {
      delete process.env.MS_CLIENT_ID;
      const mobile = await server().get('/auth/microsoft?client=mobile').expect(302);
      expect(location(mobile)).toMatch(/^timemanager:\/\/login\?error=/);
      expect(query(location(mobile)).get('error')).toBe('Connexion Microsoft non configurée sur le serveur');
      await server().get('/auth/microsoft').expect(400); // web: unchanged
    });

    it('brings the mobile app back with our token and links the Microsoft account', async () => {
      microsoftAnswers({ id_token: idToken({ oid: 'ms-oid-1', preferred_username: 'EMPA@test.fr' }) });
      const res = await server().get('/auth/microsoft/callback?code=abc&state=mobile.0123456789abcdef').expect(302);

      expect(location(res)).toMatch(/^timemanager:\/\/login\?token=/);
      const payload = jwt.verify(query(location(res)).get('token')!);
      expect(payload).toMatchObject({ sub: 'empA', role: 'EMPLOYEE', branchId: 'b1' });
      expect(users.rows.find((u) => u.id === 'empA')?.msOid).toBe('ms-oid-1');
    });

    it('brings the mobile app back with the error to show', async () => {
      microsoftAnswers({ id_token: idToken({ oid: 'ms-oid-2', preferred_username: 'inconnu@test.fr' }) });
      const unknown = await server().get('/auth/microsoft/callback?code=abc&state=mobile.x').expect(302);
      expect(location(unknown)).toMatch(/^timemanager:\/\/login\?error=/);
      expect(query(location(unknown)).get('token')).toBeNull();

      const cancelled = await server().get('/auth/microsoft/callback?error=access_denied&state=mobile.x').expect(302);
      expect(query(location(cancelled)).get('error')).toBe('Connexion Microsoft annulée');

      microsoftAnswers({ error: 'invalid_grant' }, false);
      const refused = await server().get('/auth/microsoft/callback?code=bad&state=mobile.x').expect(302);
      expect(query(location(refused)).get('error')).toContain('invalid_grant');
    });

    it('uses MOBILE_SSO_REDIRECT when set', async () => {
      process.env.MOBILE_SSO_REDIRECT = 'timemanager-dev://login';
      microsoftAnswers({ id_token: idToken({ oid: 'ms-oid-1', preferred_username: 'empA@test.fr' }) });
      const res = await server().get('/auth/microsoft/callback?code=abc&state=mobile.x').expect(302);
      expect(location(res)).toMatch(/^timemanager-dev:\/\/login\?token=/);
    });

    it('keeps the web behaviour unchanged', async () => {
      process.env.FRONTEND_URL = 'http://localhost:8080';
      microsoftAnswers({ id_token: idToken({ oid: 'ms-oid-1', preferred_username: 'empA@test.fr' }) });
      const res = await server().get('/auth/microsoft/callback?code=abc&state=web.x').expect(302);
      expect(location(res)).toMatch(/^http:\/\/localhost:8080\/login\?token=/);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('answers the same whether the account exists or not', async () => {
      const unknown = await server().post('/auth/forgot-password').send({ email: 'inconnu@test.fr' }).expect(200);
      expect(unknown.body).toEqual({});
    });

    it('returns the token in development only, never in production', async () => {
      const dev = await server().post('/auth/forgot-password').send({ email: 'empA@test.fr' }).expect(200);
      expect(dev.body.token).toMatch(/^[0-9a-f]{48}$/);

      process.env.NODE_ENV = 'production';
      const prod = await server().post('/auth/forgot-password').send({ email: 'empA@test.fr' }).expect(200);
      expect(prod.body).toEqual({});
    });
  });
});
