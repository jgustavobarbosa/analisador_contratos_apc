/**
 * EPIC-10 / EPIC-11 — contratos compartilhados do núcleo analytics.
 * Track: REAL (dados tenant) ou simulation (fixtures).
 */

export type AnalyticsTrack = 'real' | 'simulation';

export type ProviderSegment =
  | 'HOSPITAL'
  | 'CLINICA'
  | 'HOME_CARE'
  | 'LABORATORIO_IMAGEM'
  | 'ONCOLOGIA';

export type FraudSeverity = 'low' | 'medium' | 'critical';

/** De-para unificado de insumos/serviços (EPIC-11). */
export type CatalogCrosswalkItem = {
  internalCode: string;
  description: string;
  tussCode?: string;
  tissCode?: string;
  brasindiceCode?: string;
  simproCode?: string;
  anvisaRegistry?: string;
  /** Pacote pai (ex.: taxa de sala / diária) — itens membros não devem ser cobrados à parte. */
  packageParentCode?: string;
  unit?: string;
};

export type BilledLineItem = {
  lineId: string;
  internalCode: string;
  tussCode?: string;
  chargedAmountBrl: number;
  quantity: number;
  billedAt: string;
  guideId?: string;
  authorizationCode?: string;
  surgicalPorte?: 'ambulatorial' | 'pequeno' | 'medio' | 'grande' | 'especial';
  diariasCobradas?: number;
  complexity?: 'baixa' | 'media' | 'alta';
};

export type PeerPriceObservation = {
  internalCode: string;
  tussCode?: string;
  amountBrl: number;
  providerSegment: ProviderSegment;
  region?: string;
};

export type CatalogValidationAlert = {
  alertId: string;
  severity: FraudSeverity;
  kind: 'price_outlier' | 'unbundling' | 'missing_crosswalk';
  message: string;
  lineId?: string;
  internalCode?: string;
  evidence: Record<string, number | string | boolean | null>;
};

/** Inputs para score de contrato (EPIC-10). */
export type ContractScoreInput = {
  contractId: string;
  label: string;
  providerSegment: ProviderSegment;
  region?: string;
  track: AnalyticsTrack;
  /** 0–1 histórico de glosa (maior = pior). */
  historicalGlosaRate: number;
  /** Preço médio do contrato vs média da rede (1.0 = paridade; >1 mais caro). */
  priceVsNetworkIndex: number;
  /** 0–1 conformidade ANS/RDC36. */
  regulatoryComplianceScore: number;
  /** Dias médios para resolver discrepâncias. */
  avgDiscrepancyResolutionDays: number;
  /** Aditivos pendentes de formalização. */
  pendingAdditivesCount: number;
  /** Cláusulas destacadas para renegociação. */
  notableClauses?: Array<{
    clauseCode: string;
    title: string;
    contractValue: number;
    networkMedian: number;
    unit?: string;
  }>;
};

export type ContractScoreBreakdown = {
  glosaComponent: number;
  priceComponent: number;
  complianceComponent: number;
  resolutionComponent: number;
};

export type ContractScoreResult = {
  contractId: string;
  label: string;
  providerSegment: ProviderSegment;
  region?: string;
  score: number;
  breakdown: ContractScoreBreakdown;
  isBenchmark: boolean;
  marginLeakageNotes: string[];
  renegotiationOpportunities: string[];
};

export type SegmentRankingResult = {
  track: AnalyticsTrack;
  segment: ProviderSegment;
  region?: string;
  benchmarkContractId: string;
  benchmarkLabel: string;
  ranking: ContractScoreResult[];
  generatedAt: string;
};

export type FraudAlert = {
  alertId: string;
  severity: FraudSeverity;
  ruleId: string;
  title: string;
  message: string;
  guideId?: string;
  evidence: Record<string, number | string | boolean | null>;
};

export type AnalyticsBundle = {
  track: AnalyticsTrack;
  catalogAlerts: CatalogValidationAlert[];
  ranking: SegmentRankingResult;
  fraudAlerts: FraudAlert[];
};
