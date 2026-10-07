import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { UserToken } from '../entities/user-token.entity';
import { Role, TokenType, UserStatus } from '../entities/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserToken) private readonly tokens: Repository<UserToken>,
    private readonly jwt: JwtService,
  ) {}

  // --- Login (email/password) ---
  async login(email: string, password: string) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account not activated');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.sign(user.id, user.email, user.role, user.branchId);
  }

  sign(sub: string, email: string, role: Role, branchId?: string | null) {
    const payload = { sub, email, role, branchId: branchId ?? null };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: sub, email, role, branchId: branchId ?? null },
    };
  }

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // --- Token helpers (activation / password reset) ---
  // The email itself is out of scope; in dev we return the token so the flow
  // is testable. In prod you'd email a link containing it.
  async issueToken(userId: string, type: TokenType, ttlMinutes: number) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await this.tokens.save(this.tokens.create({ userId, token, type, expiresAt }));
    return token;
  }

  private async consumeToken(token: string, type: TokenType) {
    const row = await this.tokens.findOne({ where: { token, type } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }
    row.usedAt = new Date();
    await this.tokens.save(row);
    return row.userId;
  }

  // Forgot password: always succeeds silently (don't reveal if the email exists).
  // Link valid 30 min (mockup page 02).
  async requestPasswordReset(email: string): Promise<{ token?: string }> {
    const user = await this.users.findOne({ where: { email } });
    if (!user) return {}; // no leak
    const token = await this.issueToken(user.id, TokenType.PASSWORD_RESET, 30);
    return { token }; // dev convenience; prod would email it instead
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.consumeToken(token, TokenType.PASSWORD_RESET);
    await this.users.update(userId, {
      passwordHash: await AuthService.hash(newPassword),
      status: UserStatus.ACTIVE,
    });
    return { reset: true };
  }

  // Change password while logged in (mockup page 03: verify current password).
  async changePassword(userId: string, current: string, next: string) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user || !user.passwordHash) {
      throw new BadRequestException('No password set (Microsoft account?)');
    }
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is wrong');
    await this.users.update(userId, {
      passwordHash: await AuthService.hash(next),
    });
    return { changed: true };
  }

  // Activation: new user sets their first password (link valid 48h, mockup page 09).
  async activate(token: string, password: string) {
    const userId = await this.consumeToken(token, TokenType.ACTIVATION);
    await this.users.update(userId, {
      passwordHash: await AuthService.hash(password),
      status: UserStatus.ACTIVE,
    });
    return { activated: true };
  }
}
