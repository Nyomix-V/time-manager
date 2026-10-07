import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../entities/enums';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  findAll(
    @CurrentUser() actor: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('teamId') teamId?: string,
    @Query('role') role?: Role,
  ) {
    return this.users.findAll(actor, { branchId, teamId, role });
  }

  @Get(':id')
  findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.users.getScoped(actor, id);
  }

  // Managers/directeurs/admins register users (directeur & admin can create managers).
  @Post()
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.users.remove(actor, id);
  }
}
