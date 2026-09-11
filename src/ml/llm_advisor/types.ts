/**
 * EPIC-8 / copiloto LLM — recomendações prescritivas e minutas (saúde suplementar).
 */

export type AdvisorTrack = 'simulation' | 'real';

export type ContractDiagnosisRequest = {
  track?: AdvisorTrack;
  tenantLabel: string;
  providerSegment: string;
  operadoraLabel?: string;
  dossier: {
    activeClauses: Array<{
      code: string;
      title: string;
      text: string;
      ansReajusteLimitPct?: number;
    }>;
    additives: Array<{
      version: number;
      title: string;
      effectiveAt: string;
      summary: string;
    }>;
    priceTable?: Array<{ code: string; amount: number }>;
  };
  benchmark?: {
    benchmarkLabel: string;
    benchmarkScore: number;
    subjectScore: number;
    subjectLabel: string;
    priceGapPct?: number;
    renegotiationHints?: string[];
  };
  recurrentGlosas: Array<{
    tussCode: string;
    count: number;
    amountAtRiskBrl: number;
    reason?: string;
  }>;
  volumeMensalEstimadoBrl?: number;
  judicialDemandSignal?: 'baixo' | 'moderado' | 'alto';
};

export type OptimizationAction = {
  priority: 1 | 2 | 3;
  title: string;
  estimatedMonthlyImpactBrl: number;
  rationale: string;
  relatedClauseCodes?: string[];
};

export type ExecutiveDiagnosis = {
  strengths: string[];
  weaknesses: string[];
  outdatedAnsClauses: Array<{
    code: string;
    title: string;
    issue: string;
    regulation: 'RN 510/2022' | 'RN 507/2022' | 'RDC 36/2013' | 'ANS geral';
  }>;
};

export type OperationalRiskAlert = {
  severity: 'low' | 'medium' | 'critical';
  title: string;
  message: string;
};

/** Card acionável do feed de IA. */
export type AdvisorInsightCard = {
  insightId: string;
  title: string;
  estimatedImpactBrl: number;
  contractualEvidence: string;
  actionLabel: 'Gerar Minuta de Aditivo' | 'Gerar Notificação';
  distortionType:
    | 'open_to_package'
    | 'preauth_gap'
    | 'price_table'
    | 'ans_deadline'
    | 'unbundling';
};

export type ContractDiagnosisResponse = {
  track: AdvisorTrack;
  model: string;
  generatedAt: string;
  executiveSummary: string;
  diagnosis: ExecutiveDiagnosis;
  financialOptimizationPlan: OptimizationAction[];
  operationalRiskAlerts: OperationalRiskAlert[];
  insights: AdvisorInsightCard[];
};

export type GenerateClauseRequest = {
  track?: AdvisorTrack;
  tenantLabel: string;
  providerSegment: string;
  operadoraLabel?: string;
  insightId?: string;
  distortionType: AdvisorInsightCard['distortionType'];
  title?: string;
  contractualEvidence?: string;
  estimatedImpactBrl?: number;
  /** Contexto livre do diagnóstico. */
  diagnosisContext?: string;
};

export type AdditiveDraft = {
  track: AdvisorTrack;
  model: string;
  generatedAt: string;
  documentTitle: string;
  preamble: string;
  clauses: Array<{ number: string; heading: string; body: string }>;
  closing: string;
  fullText: string;
  disclaimer: string;
};

/** Scorecard mínimo aceito pelo endpoint de auditoria (espelho do core). */
export type AuditScorecardInput = {
  overallScore: number;
  scoreByDimension: Record<
    string,
    { score: number; maxScore: number; status: string }
  >;
  checklist: Array<{
    id: string;
    dimension: string;
    title: string;
    status: 'CONFORME' | 'PARCIAL' | 'NAO_CONFORME';
    evidence: string;
    financialImpactPotential: number;
    recommendedAction: string;
    weight?: number;
  }>;
  totalEstimatedSavings: number;
  improvementPoints: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    gap: string;
    action: string;
    savingEstimate: number;
    dimension: string;
  }>;
  formula?: string;
};

export type AuditReportRequest = {
  track?: AdvisorTrack;
  contractId: string;
  scorecard: AuditScorecardInput | import('../../core/analytics/compliance_matrix').ContractQualityScorecard;
  tenantLabel?: string;
  providerSegment?: string;
  operadoraLabel?: string;
};

export type CriticalGapItem = {
  itemId: string;
  title: string;
  dimension: string;
  status: 'PARCIAL' | 'NAO_CONFORME' | string;
  monthlyCostBrl: number;
  evidence: string;
  recommendedAction: string;
};

export type RenegotiationArgument = {
  title: string;
  technicalArgument: string;
  regulatoryBasis: string;
  commercialTalkTrack: string;
  estimatedMonthlyImpactBrl: number;
};

export type AuditReportResponse = {
  track: AdvisorTrack;
  model: string;
  generatedAt: string;
  contractId: string;
  executiveSummary: string;
  criticalGaps: CriticalGapItem[];
  renegotiationStrategy: RenegotiationArgument[];
  fullMarkdown: string;
  disclaimer: string;
  llmUsed: boolean;
};
