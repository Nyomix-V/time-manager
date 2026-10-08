import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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

/**
 * What anyone may change on their own account (PUT /users/me, subject: "edit their account information").
 * Role, branch, team and planning stay in the manager's hands.
 */
export class UpdateSelfDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
}
