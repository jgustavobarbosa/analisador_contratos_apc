import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  ANY_PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from './auth.decorators';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, type AuthUser } from './auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser; cookies?: Record<string, string> }>();
    const raw = req.cookies?.[SESSION_COOKIE()];
    const user = await this.auth.resolveSession(raw);
    if (user) {
      req.user = user;
    }

    if (isPublic) {
      return true;
    }
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const anyRequired = this.reflector.getAllAndOverride<string[]>(
      ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!required || required.length === 0) &&
      (!anyRequired || anyRequired.length === 0)
    ) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (required && required.length > 0) {
      const missing = required.filter((p) => !user.permissions.includes(p));
      if (missing.length > 0) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    if (anyRequired && anyRequired.length > 0) {
      const hasAny = anyRequired.some((p) => user.permissions.includes(p));
      if (!hasAny) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE(), { path: '/' });
}

export function setSessionCookie(res: Response, token: string, maxAge: number) {
  const secure = (process.env.COOKIE_SECURE ?? 'false') === 'true';
  const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax') as
    | 'lax'
    | 'strict'
    | 'none';
  res.cookie(SESSION_COOKIE(), token, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge,
  });
}
