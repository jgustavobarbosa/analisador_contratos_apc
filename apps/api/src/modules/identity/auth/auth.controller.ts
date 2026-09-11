import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  Public,
} from './auth.decorators';
import {
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { clearSessionCookie, setSessionCookie } from './session.guard';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, rawToken } = await this.auth.login({
      email: dto.email,
      password: dto.password,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setSessionCookie(res, rawToken, this.auth.cookieOptions().maxAge);
    return this.auth.me(user);
  }

  @Post('auth/logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sessionId, user, req.ip);
    clearSessionCookie(res);
  }

  @Public()
  @Post('auth/password-reset/request')
  @HttpCode(202)
  async requestReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() req: Request,
  ) {
    await this.auth.requestPasswordReset(dto.email, req.ip);
    return { message: 'If the account exists, a reset link was sent' };
  }

  @Public()
  @Post('auth/password-reset/confirm')
  @HttpCode(200)
  async confirmReset(
    @Body() dto: PasswordResetConfirmDto,
    @Req() req: Request,
  ) {
    await this.auth.confirmPasswordReset(dto.token, dto.newPassword, req.ip);
    return { message: 'Password updated' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }
}
