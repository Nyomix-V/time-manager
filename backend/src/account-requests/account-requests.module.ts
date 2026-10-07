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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountRequest } from '../entities/account-request.entity';
import { User } from '../entities/user.entity';
import { AccountRequestType, RequestStatus, Role } from '../entities/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';

class CreateRequestDto {
  @IsEnum(AccountRequestType) type: AccountRequestType;
  @IsOptional() @IsString() field?: string;    // for INFO_CHANGE
  @IsOptional() @IsString() newValue?: string;  // for INFO_CHANGE
  @IsOptional() @IsString() reason?: string;    // free text / deletion reason
}
class DecideDto {
  @IsEnum(RequestStatus) status: RequestStatus;
  @IsOptional() @IsString() decisionComment?: string;
}

// Fields an employee is allowed to request a change on (never role/branch/email).
const EDITABLE_FIELDS = ['phone', 'firstName', 'lastName'];

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
      throw new BadRequestException('You already have a pending request');
    }
    if (dto.type === AccountRequestType.INFO_CHANGE) {
      if (!dto.field || !EDITABLE_FIELDS.includes(dto.field) || !dto.newValue) {
        throw new BadRequestException('Invalid field change request');
      }
    }
    return this.requests.save(this.requests.create({ userId, ...dto }));
  }

  listForUser(userId: string) {
    return this.requests.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  listPending() {
    return this.requests.find({
      where: { status: RequestStatus.PENDING },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async decide(id: string, deciderId: string, dto: DecideDto) {
    const req = await this.requests.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');

    // On approval, actually apply the effect.
    if (dto.status === RequestStatus.APPROVED) {
      if (req.type === AccountRequestType.INFO_CHANGE && req.field) {
        await this.users.update(req.userId, { [req.field]: req.newValue } as any);
      } else if (req.type === AccountRequestType.DELETION) {
        await this.users.softDelete(req.userId); // RGPD soft-delete
      }
    }

    req.status = dto.status;
    req.decidedById = deciderId;
    req.decisionComment = dto.decisionComment;
    req.decidedAt = new Date();
    return this.requests.save(req);
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
  listPending() {
    return this.requests.listPending();
  }

  @Get('user/:userId')
  listForUser(@Param('userId') userId: string) {
    return this.requests.listForUser(userId);
  }

  @Patch(':id/decision')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  decide(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideDto,
  ) {
    return this.requests.decide(id, actor.id, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([AccountRequest, User])],
  providers: [AccountRequestsService],
  controllers: [AccountRequestsController],
})
export class AccountRequestsModule {}
