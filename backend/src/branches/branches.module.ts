import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsOptional, IsString } from 'class-validator';
import { Branch } from '../entities/branch.entity';
import { Role } from '../entities/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

class CreateBranchDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
}
class UpdateBranchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
  ) {}

  findAll() {
    return this.branches.find({ relations: { teams: true } });
  }

  async findOne(id: string) {
    const branch = await this.branches.findOne({
      where: { id },
      relations: { teams: true },
    });
    if (!branch) throw new NotFoundException('Branche introuvable');
    return branch;
  }

  create(dto: CreateBranchDto) {
    return this.branches.save(this.branches.create(dto));
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    await this.branches.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.branches.delete(id);
    return { deleted: true };
  }
}

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  findAll() {
    return this.branches.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }

  // Branches are a company-wide (technical) concern -> admin only.
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateBranchDto) {
    return this.branches.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.branches.remove(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Branch])],
  providers: [BranchesService],
  controllers: [BranchesController],
  exports: [BranchesService],
})
export class BranchesModule {}
