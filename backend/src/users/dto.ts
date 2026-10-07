import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../entities/enums';

export class CreateUserDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() teamId?: string;

  // Planning (optional; defaults applied by the entity)
  @IsOptional() @IsString() workingDays?: string; // "1,2,3,4,5"
  @IsOptional() @IsInt() @Min(0) @Max(1439) expectedStartMin?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) workMinutesPerDay?: number;
  @IsOptional() @IsInt() @Min(0) @Max(480) breakMinutes?: number;
}

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() workingDays?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1439) expectedStartMin?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) workMinutesPerDay?: number;
  @IsOptional() @IsInt() @Min(0) @Max(480) breakMinutes?: number;
}
