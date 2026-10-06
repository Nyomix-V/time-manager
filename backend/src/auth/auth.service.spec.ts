import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let auth: AuthService;
  let users: { findByEmail: jest.Mock };
  let jwt: { sign: jest.Mock };

  beforeEach(() => {
    users = { findByEmail: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    auth = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
    );
  });

  it('rejects an unknown email', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(auth.login('x@y.z', 'secret')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong password', async () => {
    const passwordHash = await AuthService.hash('rightpassword');
    users.findByEmail.mockResolvedValue({
      id: '1',
      email: 'x@y.z',
      role: 'EMPLOYEE',
      passwordHash,
    });
    await expect(auth.login('x@y.z', 'wrongpassword')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns a token on valid credentials', async () => {
    const passwordHash = await AuthService.hash('rightpassword');
    users.findByEmail.mockResolvedValue({
      id: '1',
      email: 'x@y.z',
      role: 'EMPLOYEE',
      branchId: 'b1',
      passwordHash,
    });
    const res = await auth.login('x@y.z', 'rightpassword');
    expect(res.access_token).toBe('signed.jwt.token');
    expect(res.user).toEqual({
      id: '1',
      email: 'x@y.z',
      role: 'EMPLOYEE',
      branchId: 'b1',
    });
  });
});
