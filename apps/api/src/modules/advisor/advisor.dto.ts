import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ClauseDto {
  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsNumber()
  ansReajusteLimitPct?: number;
}

class AdditiveDto {
  @IsNumber()
  version!: number;

  @IsString()
  title!: string;

  @IsString()
  effectiveAt!: string;

  @IsString()
  summary!: string;
}

class DossierDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClauseDto)
  activeClauses!: ClauseDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditiveDto)
  additives!: AdditiveDto[];
}

class BenchmarkDto {
  @IsString()
  benchmarkLabel!: string;

  @IsNumber()
  benchmarkScore!: number;

  @IsNumber()
  subjectScore!: number;

  @IsString()
  subjectLabel!: string;

  @IsOptional()
  @IsNumber()
  priceGapPct?: number;

  @IsOptional()
  @IsArray()
  renegotiationHints?: string[];
}

class GlosaDto {
  @IsString()
  tussCode!: string;

  @IsNumber()
  count!: number;

  @IsNumber()
  amountAtRiskBrl!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ContractDiagnosisDto {
  @IsOptional()
  @IsIn(['simulation', 'real'])
  track?: 'simulation' | 'real';

  @IsString()
  tenantLabel!: string;

  @IsString()
  providerSegment!: string;

  @IsOptional()
  @IsString()
  operadoraLabel?: string;

  @ValidateNested()
  @Type(() => DossierDto)
  dossier!: DossierDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BenchmarkDto)
  benchmark?: BenchmarkDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlosaDto)
  recurrentGlosas!: GlosaDto[];

  @IsOptional()
  @IsNumber()
  volumeMensalEstimadoBrl?: number;

  @IsOptional()
  @IsIn(['baixo', 'moderado', 'alto'])
  judicialDemandSignal?: 'baixo' | 'moderado' | 'alto';
}

export class GenerateClauseDto {
  @IsOptional()
  @IsIn(['simulation', 'real'])
  track?: 'simulation' | 'real';

  @IsString()
  tenantLabel!: string;

  @IsString()
  providerSegment!: string;

  @IsOptional()
  @IsString()
  operadoraLabel?: string;

  @IsOptional()
  @IsString()
  insightId?: string;

  @IsIn([
    'open_to_package',
    'preauth_gap',
    'price_table',
    'ans_deadline',
    'unbundling',
  ])
  distortionType!:
    | 'open_to_package'
    | 'preauth_gap'
    | 'price_table'
    | 'ans_deadline'
    | 'unbundling';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  contractualEvidence?: string;

  @IsOptional()
  @IsNumber()
  estimatedImpactBrl?: number;

  @IsOptional()
  @IsString()
  diagnosisContext?: string;
}

class DimensionScoreDto {
  @IsNumber()
  score!: number;

  @IsNumber()
  maxScore!: number;

  @IsString()
  status!: string;
}

class ChecklistItemDto {
  @IsString()
  id!: string;

  @IsString()
  dimension!: string;

  @IsString()
  title!: string;

  @IsIn(['CONFORME', 'PARCIAL', 'NAO_CONFORME'])
  status!: 'CONFORME' | 'PARCIAL' | 'NAO_CONFORME';

  @IsString()
  evidence!: string;

  @IsNumber()
  financialImpactPotential!: number;

  @IsString()
  recommendedAction!: string;

  @IsOptional()
  @IsNumber()
  weight?: number;
}

class ImprovementPointDto {
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  priority!: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsString()
  title!: string;

  @IsString()
  gap!: string;

  @IsString()
  action!: string;

  @IsNumber()
  savingEstimate!: number;

  @IsString()
  dimension!: string;
}

class QualityScorecardDto {
  @IsNumber()
  overallScore!: number;

  @IsObject()
  scoreByDimension!: Record<string, DimensionScoreDto>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist!: ChecklistItemDto[];

  @IsNumber()
  totalEstimatedSavings!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImprovementPointDto)
  improvementPoints!: ImprovementPointDto[];

  @IsOptional()
  @IsString()
  formula?: string;
}

export class AuditReportDto {
  @IsOptional()
  @IsIn(['simulation', 'real'])
  track?: 'simulation' | 'real';

  @IsString()
  contractId!: string;

  @ValidateNested()
  @Type(() => QualityScorecardDto)
  scorecard!: QualityScorecardDto;

  @IsOptional()
  @IsString()
  tenantLabel?: string;

  @IsOptional()
  @IsString()
  providerSegment?: string;

  @IsOptional()
  @IsString()
  operadoraLabel?: string;
}
