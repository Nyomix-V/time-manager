import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { Role, UserStatus } from '../entities/enums';
import { FakeRepository } from '../testing/fake-repository';

describe('JwtStrategy.validate', () => {
  const users = new FakeRepository<User>().seed(
    { id: 'active', email: 'a@test.fr', role: Role.MANAGER, branchId: 'b1', status: UserStatus.ACTIVE },
    { id: 'disabled', email: 'd@test.fr', role: Role.EMPLOYEE, branchId: 'b1', status: UserStatus.DISABLED },
    { id: 'deleted', email: 'x@test.fr', role: Role.EMPLOYEE, branchId: 'b1', status: UserStatus.ACTIVE, deletedAt: new Date() },
  );
  const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'test' }), users as any);
  // What the token says: possibly outdated.
  const token = (sub: string) => ({ sub, email: 'old@test.fr', role: 'EMPLOYEE', branchId: 'b2' });

  it('reads role and branch from the database, not from the token', async () => {
    expect(await strategy.validate(token('active'))).toEqual({ id: 'active', email: 'a@test.fr', role: Role.MANAGER, branchId: 'b1' });
  });

  it('refuses a deleted, disabled or unknown account at once', async () => {
    for (const sub of ['deleted', 'disabled', 'nobody']) {
      await expect(strategy.validate(token(sub))).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });
});
