import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CurrentUser,
  RequirePermissions,
  TenantId,
} from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  document?: string;
}

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  @RequirePermissions('org:read')
  async getMine(@TenantId() tenantId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { tenantId },
    });
  }

  @Patch('me')
  @RequirePermissions('org:write')
  async updateMine(
    @TenantId() tenantId: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const org = await this.prisma.organization.update({
      where: { tenantId },
      data: {
        legalName: dto.legalName,
        document: dto.document,
      },
    });
    await this.audit.record({
      tenantId,
      actorUserId: actor.id,
      action: 'organization_updated',
      target: org.id,
    });
    return org;
  }
}
