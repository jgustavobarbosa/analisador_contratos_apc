import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProviderType } from '../../simulation';
import {
  CurrentUser,
  RequirePermissions,
} from '../identity/auth/auth.decorators';
import type { AuthUser } from '../identity/auth/auth.types';
import { DemoTrackService } from './demo-track.service';

function parseMode(raw?: string): 'mock' | 'postgres' {
  if (!raw || raw === 'mock' || raw === 'simulation') return 'mock';
  if (raw === 'postgres' || raw === 'real' || raw === 'production') {
    return 'postgres';
  }
  throw new BadRequestException(
    'mode must be mock|simulation|postgres|real|production',
  );
}

function parseProviderType(raw: string): ProviderType {
  const upper = raw.toUpperCase() as ProviderType;
  if (!Object.values(ProviderType).includes(upper)) {
    throw new BadRequestException(
      `Unknown ProviderType: ${raw}. Use HOSPITAL|CLINICA|HOME_CARE|LABORATORIO_IMAGEM`,
    );
  }
  return upper;
}

@Controller('demo')
export class DemoTrackController {
  constructor(private readonly demo: DemoTrackService) {}

  @Get('provider-types')
  @RequirePermissions('dossier:read')
  listTypes(@Res({ passthrough: true }) res: Response) {
    res.setHeader('X-Rayia-Track', 'simulation');
    return { track: 'simulation', types: this.demo.listProviderTypes() };
  }

  @Get('contracts')
  @RequirePermissions('dossier:read')
  async listContracts(
    @CurrentUser() user: AuthUser,
    @Query('mode') modeRaw: string | undefined,
    @Headers('x-rayia-track') trackHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const mode = parseMode(modeRaw ?? trackHeader);
    res.setHeader('X-Rayia-Track', mode === 'mock' ? 'simulation' : 'real');
    return {
      mode,
      contracts: await this.demo.listContracts(mode, user.tenantId),
    };
  }

  @Get('providers/:type/profile')
  @RequirePermissions('dossier:read')
  async profile(
    @CurrentUser() user: AuthUser,
    @Param('type') type: string,
    @Query('mode') modeRaw: string | undefined,
    @Query('seed') seedRaw: string | undefined,
    @Query('guideCount') guideCountRaw: string | undefined,
    @Query('withAnalytics') withAnalyticsRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const mode = parseMode(modeRaw);
    if (mode !== 'mock') {
      throw new BadRequestException(
        'Full synthetic profile only available with mode=mock',
      );
    }
    res.setHeader('X-Rayia-Track', 'simulation');
    const providerType = parseProviderType(type);
    const opts = {
      seed: seedRaw ? Number(seedRaw) : 42,
      guideCount: guideCountRaw ? Number(guideCountRaw) : 20,
    };
    if (withAnalyticsRaw === '1' || withAnalyticsRaw === 'true') {
      return this.demo.profileWithAnalytics(providerType, opts);
    }
    return this.demo.profile('mock', providerType, user.tenantId, opts);
  }

  @Get('analytics/providers/:type')
  @RequirePermissions('dossier:read')
  async analytics(
    @Param('type') type: string,
    @Query('seed') seedRaw: string | undefined,
    @Query('guideCount') guideCountRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('X-Rayia-Track', 'simulation');
    const providerType = parseProviderType(type);
    return this.demo.analyticsOnly(providerType, {
      seed: seedRaw ? Number(seedRaw) : 42,
      guideCount: guideCountRaw ? Number(guideCountRaw) : 20,
    });
  }

  @Get('contracts/:id/bundle')
  @RequirePermissions('dossier:read')
  async bundle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('mode') modeRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const mode = parseMode(modeRaw ?? (id.startsWith('sim:') ? 'mock' : 'postgres'));
    res.setHeader('X-Rayia-Track', mode === 'mock' ? 'simulation' : 'real');
    const bundle = await this.demo.bundle(mode, id, user.tenantId);
    if (!bundle) {
      throw new BadRequestException('Contract bundle not found');
    }
    return bundle;
  }
}
