import { Body, Controller, Post, HttpCode, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from './current-user.decorator';
import { AuthUser } from './scope';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}

class ForgotDto {
  @IsEmail() email: string;
}

// Password policy (mockup): 12+ chars, one uppercase, one digit, one special.
const STRONG = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

class ResetDto {
  @IsString() token: string;
  @Matches(STRONG, { message: 'Password too weak' }) password: string;
}

class ActivateDto {
  @IsString() token: string;
  @Matches(STRONG, { message: 'Password too weak' }) password: string;
}

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @Matches(STRONG, { message: 'Password too weak' }) newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // Mockup page 02 — sends a reset link (here returns the token in dev).
  @Post('forgot-password')
  @HttpCode(200)
  forgot(@Body() dto: ForgotDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  reset(@Body() dto: ResetDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  // Mockup page 09 — new user sets their first password from the invite link.
  @Post('activate')
  @HttpCode(200)
  activate(@Body() dto: ActivateDto) {
    return this.auth.activate(dto.token, dto.password);
  }

  // Change password while logged in (mockup page 03).
  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() actor: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(actor.id, dto.currentPassword, dto.newPassword);
  }

  // Microsoft SSO stays a stub (needs Azure AD app registration):
  // GET /auth/microsoft -> redirect ; /auth/microsoft/callback -> issue our JWT.
}
