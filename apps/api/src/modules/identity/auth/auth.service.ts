import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from './auth.types';
import {
  generateOpaqueToken,
  hashPassword,
  sha256,
  verifyPassword,
} from './crypto.util';
import { validatePasswordPolicy } from './password-policy';
import { createAuthRateLimiter, InMemoryRateLimiter } from './rate-limiter';

const GENERIC_AUTH_FAILURE = 'Invalid credentials';

@Injectable()
export class AuthService {
  private readonly rateLimiter: InMemoryRateLimiter = createAuthRateLimiter();
  /** PoC: store reset plaintext tokens for mail stub (tests assert link). */
  readonly lastResetTokens = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private sessionTtlMs(): number {
    const hours = Number(process.env.SESSION_TTL_HOURS ?? 12);
    return hours * 60 * 60 * 1000;
  }

  private resetTtlMs(): number {
    const minutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30);
    return minutes * 60 * 1000;
  }

  private maxFailures(): number {
    return Number(process.env.LOGIN_MAX_FAILURES ?? 5);
  }

  private lockoutMs(): number {
    return Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15) * 60 * 1000;
  }

  cookieOptions() {
    const secure = (process.env.COOKIE_SECURE ?? 'false') === 'true';
    const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax') as
      | 'lax'
      | 'strict'
      | 'none';
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: this.sessionTtlMs(),
    };
  }

  async login(input: {
    email: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ user: AuthUser; rawToken: string }> {
    const rateKey = `login:${input.ip ?? 'unknown'}:${input.email.toLowerCase()}`;
    if (!this.rateLimiter.check(rateKey)) {
      throw new ForbiddenException('Too many attempts');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user || user.status !== 'active') {
      await this.audit.record({
        action: 'login_failure',
        target: input.email,
        ip: input.ip,
        metadata: { reason: 'not_found_or_disabled' },
      });
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: 'login_locked',
        ip: input.ip,
      });
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      const failures = user.failedLogins + 1;
      const lockedUntil =
        failures >= this.maxFailures()
          ? new Date(Date.now() + this.lockoutMs())
          : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failures,
          lockedUntil: lockedUntil ?? undefined,
        },
      });
      await this.audit.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: lockedUntil ? 'login_locked' : 'login_failure',
        ip: input.ip,
      });
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }

    const rawToken = generateOpaqueToken();
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs());

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.audit.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: 'login_success',
      ip: input.ip,
    });

    const authUser: AuthUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      organizationId: user.organizationId,
      roleId: user.roleId,
      roleCode: user.role.code,
      permissions: user.role.permissions.map((p) => p.permission.code),
      sessionId: session.id,
    };

    return { user: authUser, rawToken };
  }

  async logout(sessionId: string, actor: AuthUser, ip?: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.id,
      action: 'logout',
      ip,
    });
  }

  async resolveSession(rawToken: string | undefined): Promise<AuthUser | null> {
    if (!rawToken) return null;
    const tokenHash = sha256(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }
    if (session.user.status !== 'active') {
      return null;
    }
    return {
      id: session.user.id,
      tenantId: session.user.tenantId,
      email: session.user.email,
      organizationId: session.user.organizationId,
      roleId: session.user.roleId,
      roleCode: session.user.role.code,
      permissions: session.user.role.permissions.map((p) => p.permission.code),
      sessionId: session.id,
    };
  }

  async requestPasswordReset(email: string, ip?: string) {
    const rateKey = `reset:${ip ?? 'unknown'}:${email.toLowerCase()}`;
    if (!this.rateLimiter.check(rateKey)) {
      throw new ForbiddenException('Too many attempts');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        status: 'active',
      },
    });

    await this.audit.record({
      tenantId: user?.tenantId,
      actorUserId: user?.id,
      action: 'password_reset_requested',
      target: email,
      ip,
      metadata: { issued: Boolean(user) },
    });

    if (user) {
      const rawToken = generateOpaqueToken();
      const tokenHash = sha256(rawToken);
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + this.resetTtlMs()),
        },
      });
      this.lastResetTokens.set(user.email.toLowerCase(), rawToken);
      // PoC: no SMTP — log token for local/dev (never in production logs for real e-mails)
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(
          `[password-reset] ${user.email} token=${rawToken} link=${process.env.APP_PUBLIC_URL ?? ''}/reset?token=${rawToken}`,
        );
      }
    }

    return { accepted: true as const };
  }

  async confirmPasswordReset(token: string, newPassword: string, ip?: string) {
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.ok) {
      throw new ForbiddenException('Password does not meet policy');
    }

    const tokenHash = sha256(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.user.status !== 'active'
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLogins: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      tenantId: record.user.tenantId,
      actorUserId: record.userId,
      action: 'password_reset_completed',
      ip,
    });

    return { ok: true as const };
  }

  me(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      role: user.roleCode,
      permissions: user.permissions,
    };
  }
}
