import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { UserToken } from '../entities/user-token.entity';
import { Role } from '../entities/enums';

describe('AuthService', () => {
  let auth: AuthService;
  let jwt: { sign: jest.Mock };

  beforeEach(() => {
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    auth = new AuthService(
      {} as Repository<User>,
      {} as Repository<UserToken>,
      jwt as unknown as JwtService,
    );
  });

  it('hashes and verifies a password roundtrip', async () => {
    const hash = await AuthService.hash('password123');
    const bcrypt = await import('bcrypt');
    expect(await bcrypt.compare('password123', hash)).toBe(true);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });

  it('signs a JWT carrying id, email, role and branchId', () => {
    const res = auth.sign('1', 'x@y.z', Role.MANAGER, 'b1');
    expect(res.access_token).toBe('signed.jwt.token');
    expect(res.user).toEqual({
      id: '1',
      email: 'x@y.z',
      role: Role.MANAGER,
      branchId: 'b1',
    });
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: '1',
      email: 'x@y.z',
      role: Role.MANAGER,
      branchId: 'b1',
    });
  });
});
