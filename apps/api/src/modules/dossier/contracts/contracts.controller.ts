import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  TenantId,
} from '../../identity/auth/auth.decorators';
import type { AuthUser } from '../../identity/auth/auth.types';
import { CreateContractDto } from './contracts.dto';
import { UploadDocumentDto } from './documents.dto';
import { DossierService } from '../dossier.service';

/** Minimal Multer file shape (avoids hard dep on @types/multer). */
type UploadedPdf = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

function parseDateQuery(raw: string | undefined, label: string): Date {
  if (!raw) {
    throw new BadRequestException(`Query "${label}" is required (YYYY-MM-DD)`);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) {
    throw new BadRequestException(`Invalid ${label}; use YYYY-MM-DD`);
  }
  return new Date(`${raw}T12:00:00.000Z`);
}

@ApiTags('contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly dossierService: DossierService) {}

  @Post()
  @RequirePermissions('dossier:write')
  create(@TenantId() tenantId: string, @Body() dto: CreateContractDto) {
    return this.dossierService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('dossier:read')
  list(@TenantId() tenantId: string) {
    return this.dossierService.list(tenantId);
  }

  @Post('seed/golden-oncoradium')
  @HttpCode(200)
  @RequirePermissions('dossier:write')
  seedGolden(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dossierService.seedGoldenOncoradium(tenantId, user.id);
  }

  @Post('seed/unimed-pdfs')
  @HttpCode(200)
  @RequirePermissions('dossier:write')
  seedUnimedPdfs(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dossierService.seedUnimedPdfs(tenantId, user.id);
  }

  @Get(':id')
  @RequirePermissions('dossier:read')
  get(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossierService.get(tenantId, id);
  }

  @Get(':id/dossier')
  @RequirePermissions('dossier:read')
  getDossier(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossierService.getDossier(tenantId, id);
  }

  @Get(':id/dossier/at')
  @RequirePermissions('dossier:read')
  getDossierAt(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
  ) {
    return this.dossierService.getDossierAt(
      tenantId,
      id,
      parseDateQuery(date, 'date'),
    );
  }

  @Get(':id/prices/:code')
  @RequirePermissions('dossier:read')
  price(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('code') code: string,
    @Query('at') at: string,
  ) {
    return this.dossierService.queryPrice(
      tenantId,
      id,
      code,
      parseDateQuery(at, 'at'),
    );
  }

  @Get(':id/timeline')
  @RequirePermissions('dossier:read')
  timeline(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossierService.timeline(tenantId, id);
  }

  @Get(':id/export.json')
  @RequirePermissions('dossier:export')
  exportJson(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossierService.exportJson(tenantId, id);
  }

  @Get(':id/documents')
  @RequirePermissions('dossier:read')
  listDocuments(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossierService.listDocuments(tenantId, id);
  }

  @Post(':id/documents')
  @RequirePermissions('dossier:write')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedPdf | undefined,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.dossierService.uploadDocument(
      tenantId,
      id,
      user.id,
      file,
      dto,
    );
  }

  /**
   * Assisted extraction — JSON paths, no LLM/OCR.
   * Body: `[{path,value,confidence}]` or `{fields:[...]}` or structured prices/coverage.
   */
  @Post(':id/documents/:docId/extract-assisted')
  @HttpCode(200)
  @RequirePermissions('dossier:write')
  extractAssisted(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() body: unknown,
  ) {
    return this.dossierService.extractAssisted(tenantId, id, docId, body);
  }
}
