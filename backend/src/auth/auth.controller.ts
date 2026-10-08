import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from './current-user.decorator';
import { AuthUser } from './scope';

// No length rule on login: a wrong password, even a short one, is just "incorrect".
class LoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}

class ForgotDto {
  @IsEmail() email: string;
}

// Password policy (mockup): 12+ chars, one uppercase, one digit, one special.
const STRONG = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

class ResetDto {
  @IsString() token: string;
  @Matches(STRONG, { message: 'Mot de passe trop faible : 12 caractères, une majuscule, un chiffre et un caractère spécial' }) password: string;
}

class ActivateDto {
  @IsString() token: string;
  @Matches(STRONG, { message: 'Mot de passe trop faible : 12 caractères, une majuscule, un chiffre et un caractère spécial' }) password: string;
}

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @Matches(STRONG, { message: 'Mot de passe trop faible : 12 caractères, une majuscule, un chiffre et un caractère spécial' }) newPassword: string;
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

  // --- Microsoft SSO (server-side flow) ---
  // Step 1: send the user to Microsoft's sign-in page.
  // ?client=mobile: the mobile app opened this page; step 2 sends the user back to the app.
  @Get('microsoft')
  microsoft(@Query('client') client: string | undefined, @Res() res: Response) {
    return res.redirect(this.auth.buildMicrosoftAuthUrl(client === 'mobile' ? 'mobile' : 'web'));
  }

  // Step 2: Microsoft redirects back here with ?code=... -> we issue our JWT.
  // Mobile app: redirect to the app (deep link) with the token, or the error to show.
  // Web: if FRONTEND_URL is set, redirect there with the token; else return JSON.
  @Get('microsoft/callback')
  async microsoftCallback(@Query('code') code: string, @Query('state') state: string | undefined, @Res() res: Response) {
    if (AuthService.isMobileState(state)) {
      const app = process.env.MOBILE_SSO_REDIRECT || 'timemanager://login';
      if (!code) return res.redirect(`${app}?error=${encodeURIComponent('Connexion Microsoft annulée')}`);
      try {
        const { access_token } = await this.auth.handleMicrosoftCallback(code);
        return res.redirect(`${app}?token=${encodeURIComponent(access_token)}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Connexion Microsoft impossible';
        return res.redirect(`${app}?error=${encodeURIComponent(message)}`);
      }
    }

    const result = await this.auth.handleMicrosoftCallback(code);
    const front = process.env.FRONTEND_URL;
    if (front) {
      return res.redirect(`${front}/login?token=${result.access_token}`);
    }
    return res.json(result);
  }
}
