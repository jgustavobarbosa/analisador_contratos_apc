import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../identity/auth/auth.decorators';
import { AdvisorService } from './advisor.service';
import {
  AuditReportDto,
  ContractDiagnosisDto,
  GenerateClauseDto,
} from './advisor.dto';

@Controller('api/advisor')
export class AdvisorController {
  constructor(private readonly advisor: AdvisorService) {}

  @Post('contract-diagnosis')
  @RequirePermissions('dossier:read')
  async contractDiagnosis(
    @Body() body: ContractDiagnosisDto,
    @Headers('x-rayia-track') trackHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const track =
      body.track ??
      (trackHeader === 'real' || trackHeader === 'production'
        ? 'real'
        : 'simulation');
    res.setHeader('X-Rayia-Track', track);
    return this.advisor.diagnose({ ...body, track });
  }

  @Post('generate-clause-renegotiation')
  @RequirePermissions('dossier:read')
  async generateClause(
    @Body() body: GenerateClauseDto,
    @Headers('x-rayia-track') trackHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const track =
      body.track ??
      (trackHeader === 'real' || trackHeader === 'production'
        ? 'real'
        : 'simulation');
    res.setHeader('X-Rayia-Track', track);
    return this.advisor.generateClause({ ...body, track });
  }

  @Post('audit-report')
  @RequirePermissions('dossier:read')
  async auditReport(
    @Body() body: AuditReportDto,
    @Headers('x-rayia-track') trackHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const track =
      body.track ??
      (trackHeader === 'real' || trackHeader === 'production'
        ? 'real'
        : 'simulation');
    res.setHeader('X-Rayia-Track', track);
    return this.advisor.generateAuditReport({ ...body, track });
  }
}
