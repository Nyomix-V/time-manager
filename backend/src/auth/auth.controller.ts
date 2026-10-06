import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // Microsoft SSO endpoints are stubbed here; wire passport-azure-ad
  // (OIDC) to validate the MS token, upsert the user by msOid, then this.auth.sign(...).
  // GET /auth/microsoft           -> redirect to Microsoft
  // GET /auth/microsoft/callback  -> exchange code, issue our JWT
}
