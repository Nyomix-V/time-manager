import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserStatus } from '../entities/enums';
import { AuthUser } from './scope';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  branchId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev_change_me'),
    });
  }

  // Whatever is returned here is attached to request.user.
  // A valid signature is not enough: the account must still exist and be active
  // (a deleted or disabled account loses access at once, not when its token expires),
  // and role / branch are read from the database, so a change applies immediately.
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } }); // soft-deleted rows excluded
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Session expirée, reconnectez-vous');
    }
    return { id: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null };
  }
}
