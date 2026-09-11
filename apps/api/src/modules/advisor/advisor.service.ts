import { Injectable } from '@nestjs/common';
import {
  LlmAdvisorService,
  type ContractDiagnosisRequest,
  type ContractDiagnosisResponse,
  type GenerateClauseRequest,
  type AdditiveDraft,
  type AuditReportRequest,
  type AuditReportResponse,
} from '../../ml/llm_advisor';

@Injectable()
export class AdvisorService {
  private readonly engine = new LlmAdvisorService();

  diagnose(
    body: ContractDiagnosisRequest,
  ): Promise<ContractDiagnosisResponse> {
    return this.engine.diagnose({
      ...body,
      track: body.track ?? 'simulation',
    });
  }

  generateClause(body: GenerateClauseRequest): Promise<AdditiveDraft> {
    return this.engine.generateClause({
      ...body,
      track: body.track ?? 'simulation',
    });
  }

  generateAuditReport(body: AuditReportRequest): Promise<AuditReportResponse> {
    return this.engine.generateAuditReport({
      ...body,
      track: body.track ?? 'simulation',
    });
  }
}
