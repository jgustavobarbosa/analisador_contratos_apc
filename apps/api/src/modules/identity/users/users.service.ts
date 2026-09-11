import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { hashPassword } from '../auth/crypto.util';
import { validatePasswordPolicy } from '../auth/password-policy';
import { wouldRemoveLastAdmin } from './last-admin.guard';
import type { CreateUserDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async activeAdminCount(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        tenantId,
        status: 'active',
        role: { code: 'admin' },
      },
    });
  }

  private async findSystemRole(code: string) {
    const role = await this.prisma.role.findFirst({
      where: { code, tenantId: null },
    });
    if (!role) {
      throw new BadRequestException(`Unknown role: ${code}`);
    }
    return role;
  }

  async list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        status: true,
        role: { select: { code: true, name: true } },
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateUserDto, actor: AuthUser) {
    const policy = validatePasswordPolicy(dto.password);
    if (!policy.ok) {
      throw new BadRequestException({
        message: 'Password does not meet policy',
        reasons: policy.reasons,
      });
    }

    const org = await this.prisma.organization.findUnique({
      where: { tenantId },
    });
    if (!org) {
      throw new BadRequestException('Organization not found for tenant');
    }

    const role = await this.findSystemRole(dto.roleCode);
    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          tenantId,
          organizationId: org.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          roleId: role.id,
          status: 'active',
        },
        select: {
          id: true,
          email: true,
          status: true,
          role: { select: { code: true } },
        },
      });
      await this.audit.record({
        tenantId,
        actorUserId: actor.id,
        action: 'user_created',
        target: user.id,
      });
      return user;
    } catch {
      throw new BadRequestException('Unable to create user');
    }
  }

  async update(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
    actor: AuthUser,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.roleCode && dto.roleCode !== user.role.code) {
      const admins = await this.activeAdminCount(tenantId);
      if (
        wouldRemoveLastAdmin({
          targetIsAdmin: user.role.code === 'admin',
          targetIsActive: user.status === 'active',
          activeAdminCount: admins,
          action: 'demote',
        })
      ) {
        throw new ForbiddenException('Cannot demote the last admin');
      }
    }

    const data: {
      roleId?: string;
      passwordHash?: string;
    } = {};

    if (dto.roleCode) {
      const role = await this.findSystemRole(dto.roleCode);
      data.roleId = role.id;
    }
    if (dto.password) {
      const policy = validatePasswordPolicy(dto.password);
      if (!policy.ok) {
        throw new BadRequestException('Password does not meet policy');
      }
      data.passwordHash = await hashPassword(dto.password);
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        status: true,
        role: { select: { code: true } },
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: actor.id,
      action: 'user_updated',
      target: user.id,
    });

    return updated;
  }

  async disable(tenantId: string, userId: string, actor: AuthUser) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const admins = await this.activeAdminCount(tenantId);
    if (
      wouldRemoveLastAdmin({
        targetIsAdmin: user.role.code === 'admin',
        targetIsActive: user.status === 'active',
        activeAdminCount: admins,
        action: 'disable',
      })
    ) {
      throw new ForbiddenException('Cannot disable the last admin');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'disabled' },
      select: { id: true, email: true, status: true },
    });

    await this.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.record({
      tenantId,
      actorUserId: actor.id,
      action: 'user_disabled',
      target: user.id,
    });

    return updated;
  }
}
