/**
 * TRACK SIMULATION — shared contracts for demo engines.
 * Every root payload includes track: 'simulation'.
 */

export const TRACK_SIMULATION = 'simulation' as const;

export enum ProviderType {
  HOSPITAL = 'HOSPITAL',
  CLINICA = 'CLINICA',
  HOME_CARE = 'HOME_CARE',
  LABORATORIO_IMAGEM = 'LABORATORIO_IMAGEM',
}

export type ExtractionFieldDemo = {
  path: string;
  value: string | number | boolean;
  confidence: number;
  status: 'pending_review' | 'accepted' | 'rejected';
};

export type AdditiveVersionDemo = {
  version: number;
  title: string;
  effectiveAt: string;
  signedAt: string;
  summary: string;
  extractedFields: ExtractionFieldDemo[];
};

/** EPIC-1 & EPIC-2 */
export type DemoDossierSlice = {
  activeClauses: Array<{
    code: string;
    title: string;
    text: string;
    ansReajusteLimitPct: number;
  }>;
  additives: AdditiveVersionDemo[];
  coverageCodes: Array<{ code: string; action: 'include' | 'exclude'; effectiveAt: string }>;
  priceTable: Array<{ code: string; amount: number; currency: 'BRL'; effectiveAt: string }>;
};

export type ShapFeature = {
  feature: string;
  shapValue: number;
  direction: 'increases_glosa' | 'decreases_glosa';
};

/** EPIC-3 & EPIC-4 */
export type DemoGuide = {
  guideId: string;
  tussCode: string;
  attendanceAt: string;
  informedAmount: number;
  expectedAmount: number;
  operadoraFake: string;
  glosaProbability: number;
  glosaRiskLevel: 'low' | 'medium' | 'high';
  explanatoryFeatures: ShapFeature[];
  alerts: string[];
};

/** EPIC-5 */
export type DemoRegulatoryAlert = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  regulation: string;
  title: string;
  dueInDays: number | null;
  message: string;
};

/** EPIC-8 */
export type DemoProcessDiagnosis = {
  model: 'simulation-nn-proxy-v1';
  bottleneck: string;
  estimatedMonthlyLossPct: number;
  recommendation: string;
  confidence: number;
};

/** Matriz 4 pilares — espelho leve do scorecard (evita acoplamento circular de tipos). */
export type DemoQualityChecklistItem = {
  id: string;
  dimension: string;
  title: string;
  status: 'CONFORME' | 'PARCIAL' | 'NAO_CONFORME';
  evidence: string;
  financialImpactPotential: number;
  recommendedAction: string;
};

export type DemoQualityScorecard = {
  overallScore: number;
  scoreByDimension: Record<
    string,
    { score: number; maxScore: number; status: string }
  >;
  totalEstimatedSavings: number;
  improvementPoints: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    gap: string;
    action: string;
    savingEstimate: number;
    dimension: string;
  }>;
  checklist: DemoQualityChecklistItem[];
  checklistCount: number;
  formula: string;
};

export type DataTrack = typeof TRACK_SIMULATION | 'real';

export type DemoProviderProfile = {
  track: DataTrack;
  providerType: ProviderType;
  generatedAt: string;
  seed: number;
  party: {
    legalName: string;
    cnpjFake: string;
    cnesFake: string;
    focus: string;
  };
  dossier: DemoDossierSlice;
  guides: DemoGuide[];
  regulatoryAlerts: DemoRegulatoryAlert[];
  processDiagnosis: DemoProcessDiagnosis;
  qualityScorecard: DemoQualityScorecard;
};

export type DemoContractSummary = {
  track: DataTrack;
  contractId: string;
  providerType: ProviderType;
  title: string;
  partyA: string;
  partyB: string;
};

export type DataProviderMode = 'mock' | 'postgres';
