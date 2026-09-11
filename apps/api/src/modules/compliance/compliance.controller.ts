import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  RequirePermissions,
  TenantId,
} from '../identity/auth/auth.decorators';
import { ComplianceService } from './compliance.service';
import { PatchComplianceItemDto } from './compliance.dto';

@ApiTags('compliance')
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Post('ensure/:contractId')
  @HttpCode(200)
  @RequirePermissions('compliance:write')
  ensure(
    @TenantId() tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ) {
    return this.compliance.ensure(tenantId, contractId);
  }

  @Get(':contractId')
  @RequirePermissions('compliance:read')
  list(
    @TenantId() tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ) {
    return this.compliance.list(tenantId, contractId);
  }

  @Patch('items/:id')
  @RequirePermissions('compliance:write')
  patch(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchComplianceItemDto,
  ) {
    return this.compliance.patch(tenantId, id, dto);
  }
}
