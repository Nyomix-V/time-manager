import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccountRequest } from '../entities/account-request.entity';
import { User } from '../entities/user.entity';
import { AccountRequestType, RequestStatus, Role } from '../entities/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';
import { loadReadableUser } from '../auth/access';
import { DecideDto, applyDecision, decidableBy, withDeciderName, withRequester } from '../common/decision';

class CreateRequestDto {
  @IsEnum(AccountRequestType) type: AccountRequestType;
  @IsOptional() @IsString() field?: string;                     // for INFO_CHANGE
  @IsOptional() @IsString() @MaxLength(255) newValue?: string;  // for INFO_CHANGE
  @IsOptional() @IsString() @MaxLength(500) reason?: string;    // free text / deletion reason
}

// Fields an employee is allowed to request a change on (never role/branch/email).
const EDITABLE_FIELDS = ['phone', 'firstName', 'lastName'];

// Requests an employee sends to be validated by their manager (mockup page 13):
//   INFO_CHANGE -> wants a field changed (e.g. phone). On approval it is applied.
//   DELETION    -> wants their account removed (RGPD). On approval -> soft delete.
@Injectable()
export class AccountRequestsService {
  constructor(
    @InjectRepository(AccountRequest)
    private readonly requests: Repository<AccountRequest>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateRequestDto) {
    // One pending request at a time (mockup page 03).
    const pending = await this.requests.findOne({
      where: { userId, status: RequestStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException('Vous avez déjà une demande en attente');
    }
    if (dto.type === AccountRequestType.INFO_CHANGE) {
      if (!dto.field || !EDITABLE_FIELDS.includes(dto.field) || !dto.newValue?.trim()) {
        throw new BadRequestException('Demande de modification invalide');
      }
    }
    return this.requests.save(this.requests.create({ userId, ...dto }));
  }

  async listForUser(actor: AuthUser, userId: string) {
    await loadReadableUser(this.users, actor, userId);
    const rows = await this.requests.find({
      where: { userId },
      relations: { decidedBy: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map(withDeciderName);
  }

  // Only the requests the actor may decide (not the whole company).
  async listPending(actor: AuthUser) {
    const rows = await this.requests.find({
      where: { status: RequestStatus.PENDING },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return decidableBy(actor, rows).map(withRequester);
  }

  async decide(actor: AuthUser, id: string, dto: DecideDto) {
    const req = await this.requests.findOne({ where: { id }, relations: { user: true } });
    const decided = applyDecision(actor, req, dto);

    // On approval, actually apply the effect.
    if (decided.status === RequestStatus.APPROVED) {
      if (decided.type === AccountRequestType.INFO_CHANGE && decided.field) {
        await this.users.update(decided.userId, { [decided.field]: decided.newValue } as any);
      } else if (decided.type === AccountRequestType.DELETION) {
        await this.users.softDelete(decided.userId); // RGPD soft-delete
      }
    }
    const { user, ...saved } = await this.requests.save(decided);
    return saved;
  }
}

@Controller('account-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountRequestsController {
  constructor(private readonly requests: AccountRequestsService) {}

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateRequestDto) {
    return this.requests.create(actor.id, dto);
  }

  @Get('pending')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  listPending(@CurrentUser() actor: AuthUser) {
    return this.requests.listPending(actor);
  }

  @Get('user/:userId')
  listForUser(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.requests.listForUser(actor, userId);
  }

  @Patch(':id/decision')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  decide(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideDto,
  ) {
    return this.requests.decide(actor, id, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([AccountRequest, User])],
  providers: [AccountRequestsService],
  controllers: [AccountRequestsController],
})
export class AccountRequestsModule {}
