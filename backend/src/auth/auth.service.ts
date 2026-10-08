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
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Compte non activé : utilisez le lien reçu par email');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Email ou mot de passe incorrect');

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
      throw new BadRequestException('Lien invalide ou expiré');
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
      throw new BadRequestException('Aucun mot de passe défini (compte Microsoft ?)');
    }
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Mot de passe actuel incorrect');
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

  // =============================================================
  //  Microsoft SSO (server-side authorization-code flow)
  // =============================================================
  private msConfig() {
    const tenant = process.env.MS_TENANT_ID || 'common';
    return {
      tenant,
      clientId: process.env.MS_CLIENT_ID || '',
      clientSecret: process.env.MS_CLIENT_SECRET || '',
      redirectUri:
        process.env.MS_REDIRECT_URI ||
        'http://localhost:8080/api/auth/microsoft/callback',
      authority: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`,
      scope: 'openid profile email',
    };
  }

  // Step 1: the URL we send the user to, to sign in with Microsoft.
  buildMicrosoftAuthUrl(): string {
    const c = this.msConfig();
    if (!c.clientId) {
      throw new BadRequestException('Microsoft SSO not configured (MS_CLIENT_ID)');
    }
    const params = new URLSearchParams({
      client_id: c.clientId,
      response_type: 'code',
      redirect_uri: c.redirectUri,
      response_mode: 'query',
      scope: c.scope,
      state: crypto.randomBytes(8).toString('hex'),
    });
    return `${c.authority}/authorize?${params.toString()}`;
  }

  // Step 2: Microsoft redirected back with a code -> exchange it, read identity,
  // match the account by email, link it (msOid) and issue OUR JWT.
  async handleMicrosoftCallback(code: string) {
    const c = this.msConfig();
    const body = new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.redirectUri,
      scope: c.scope,
    });

    const res = await (globalThis as any).fetch(`${c.authority}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok || !data.id_token) {
      throw new UnauthorizedException(
        `Microsoft token exchange failed: ${data.error_description || data.error || res.status}`,
      );
    }

    // Decode the id_token payload (received directly from Microsoft over TLS).
    const payload = JSON.parse(
      Buffer.from(data.id_token.split('.')[1], 'base64url').toString(),
    );
    const oid: string = payload.oid;
    const email: string = (payload.preferred_username || payload.email || '').toLowerCase();

    // Accounts are provisioned by managers: match an existing user by msOid or email.
    let user = await this.users.findOne({
      where: [{ msOid: oid }, { email }],
    });
    if (!user) {
      throw new UnauthorizedException('No Time Manager account for this Microsoft user');
    }

    // Link the Microsoft identity and activate the account on first SSO login.
    await this.users.update(user.id, { msOid: oid, status: UserStatus.ACTIVE });
    return this.sign(user.id, user.email, user.role, user.branchId);
  }
}
