import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  RequirePermissions,
  TenantId,
} from '../auth/auth.decorators';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit-trail')
export class AuditTrailController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  list(
    @TenantId() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : 100;
    if (!Number.isFinite(limit) || limit < 1) {
      throw new BadRequestException('Invalid limit');
    }
    return this.audit.listTrail({
      tenantId,
      contractId,
      limit: Math.floor(limit),
    });
  }
}
