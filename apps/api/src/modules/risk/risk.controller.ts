import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  RequireAnyPermissions,
  TenantId,
} from '../identity/auth/auth.decorators';
import { RiskService } from './risk.service';

@ApiTags('risk')
@Controller('risk')
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Get('features/:contractId')
  @RequireAnyPermissions(
    'simulation:read',
    'simulation:run',
    'compliance:read',
    'dossier:read',
  )
  features(
    @TenantId() tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Query('code') code?: string,
    @Query('at') at?: string,
  ) {
    if ((code && !at) || (!code && at)) {
      throw new BadRequestException(
        'Provide both "code" and "at", or neither',
      );
    }
    return this.risk.features(tenantId, contractId, {
      code: code?.trim() || undefined,
      at: at?.trim() || undefined,
    });
  }
}
