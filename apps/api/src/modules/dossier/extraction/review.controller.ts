import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  TenantId,
} from '../../identity/auth/auth.decorators';
import type { AuthUser } from '../../identity/auth/auth.types';
import { DossierService } from '../dossier.service';
import { AcceptFieldDto } from '../extraction/extraction.dto';

@ApiTags('review')
@Controller()
export class ReviewController {
  constructor(private readonly dossierService: DossierService) {}

  @Get('review-queue')
  @RequirePermissions('dossier:review')
  reviewQueue(
    @TenantId() tenantId: string,
    @Query('contractId') contractId?: string,
  ) {
    return this.dossierService.reviewQueue(tenantId, contractId);
  }

  @Post('extracted-fields/:id/accept')
  @HttpCode(200)
  @RequirePermissions('dossier:review')
  accept(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptFieldDto,
  ) {
    return this.dossierService.acceptField(
      tenantId,
      id,
      user.id,
      dto?.value,
    );
  }

  @Post('extracted-fields/:id/reject')
  @HttpCode(200)
  @RequirePermissions('dossier:review')
  reject(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossierService.rejectField(tenantId, id, user.id);
  }

  @Post('contracts/:id/extracted-fields/accept-high-confidence')
  @HttpCode(200)
  @RequirePermissions('dossier:review')
  acceptHighConfidence(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossierService.acceptHighConfidence(tenantId, id, user.id);
  }
}
