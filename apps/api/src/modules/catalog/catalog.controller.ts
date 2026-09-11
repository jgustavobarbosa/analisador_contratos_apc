import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogSourceKind } from '@prisma/client';
import { RequirePermissions } from '../identity/auth/auth.decorators';
import { CatalogService } from './catalog.service';

const SOURCE_KINDS = new Set<string>(Object.values(CatalogSourceKind));

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('dimensions')
  @RequirePermissions('catalog:read')
  listDimensions() {
    return this.catalogService.listDimensions();
  }

  @Get('instruments')
  @RequirePermissions('catalog:read')
  listInstruments(
    @Query('dimension') dimension?: string,
    @Query('sourceKind') sourceKind?: string,
  ) {
    let kind: CatalogSourceKind | undefined;
    if (sourceKind) {
      if (!SOURCE_KINDS.has(sourceKind)) {
        throw new BadRequestException(
          `Invalid sourceKind; use: ${[...SOURCE_KINDS].join(', ')}`,
        );
      }
      kind = sourceKind as CatalogSourceKind;
    }
    return this.catalogService.listInstruments({
      dimension: dimension?.trim() || undefined,
      sourceKind: kind,
    });
  }

  @Get('instruments/:code')
  @RequirePermissions('catalog:read')
  getInstrument(@Param('code') code: string) {
    return this.catalogService.getByCode(code);
  }
}
