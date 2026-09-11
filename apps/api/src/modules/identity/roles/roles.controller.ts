import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequirePermissions } from '../auth/auth.decorators';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('user:read')
  async list() {
    const roles = await this.prisma.role.findMany({
      where: { tenantId: null },
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: { code: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      permissions: r.permissions.map((p) => p.permission.code),
    }));
  }
}
