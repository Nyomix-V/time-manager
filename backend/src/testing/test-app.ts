import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/guards';
import { createValidationPipe } from '../common/validation';
import { User } from '../entities/user.entity';
import { Role } from '../entities/enums';
import { FakeRepository } from './fake-repository';

// Two branches, every role (ids double as the "x-user" header value).
//   b1: dirA (directeur), mgrA (manager), empA + empA2 (employees)
//   b2: mgrB (manager), empB (employee)
//   admin: no branch
export function seedUsers() {
  const person = (id: string, role: Role, branchId: string | null) => ({
    id,
    role,
    branchId,
    email: `${id}@test.fr`,
    firstName: id,
    lastName: 'Test',
    phone: '0600000000',
    teamId: null,
  });
  return new FakeRepository<User>().seed(
    person('admin', Role.ADMIN, null),
    person('dirA', Role.DIRECTEUR, 'b1'),
    person('mgrA', Role.MANAGER, 'b1'),
    person('empA', Role.EMPLOYEE, 'b1'),
    person('empA2', Role.EMPLOYEE, 'b1'),
    person('mgrB', Role.MANAGER, 'b2'),
    person('empB', Role.EMPLOYEE, 'b2'),
  );
}

/** Replaces the JWT check: the "x-user" header names the logged-in user. */
class HeaderAuthGuard implements CanActivate {
  constructor(private readonly users: FakeRepository<User>) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = this.users.rows.find((u) => u.id === request.headers['x-user'] && !u.deletedAt);
    if (!user) throw new UnauthorizedException();
    request.user = { id: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null };
    return true;
  }
}

/** Real controllers, guards and pipes over in-memory repositories. */
export async function createTestApp(options: {
  controllers: any[];
  providers: any[];
  repositories: [Function, FakeRepository<any>][];
  users: FakeRepository<User>;
}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: options.controllers,
    providers: [
      ...options.providers,
      ...options.repositories.map(([entity, repo]) => ({ provide: getRepositoryToken(entity), useValue: repo })),
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(new HeaderAuthGuard(options.users))
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(createValidationPipe());
  await app.init();
  return app;
}
