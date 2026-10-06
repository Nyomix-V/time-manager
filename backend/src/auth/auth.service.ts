import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  // Validate email/password, return a signed JWT.
  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.sign(user.id, user.email, user.role, user.branchId);
  }

  sign(sub: string, email: string, role: string, branchId?: string | null) {
    const payload = { sub, email, role, branchId: branchId ?? null };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: sub, email, role, branchId: branchId ?? null },
    };
  }

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
