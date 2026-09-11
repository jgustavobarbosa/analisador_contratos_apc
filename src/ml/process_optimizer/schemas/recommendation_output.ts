import type {
  AnomalySeverity,
  RecommendationPriority,
  RootCauseKind,
} from '../types';

/** Evidência estatística anexada à recomendação prescritiva. */
export type StatisticalEvidence = {
  sampleSize: number;
  metric: string;
  baseline: number;
  observed: number;
  /** Lift relativo vs baseline (ex.: 0.35 = +35%). */
  liftPct: number;
  confidence: number;
  supportingCodes?: string[];
};

export type ActionPlanStep = {
  order: number;
  description: string;
  ownerRole: string;
  estimatedEffortDays?: number;
};

export type SuggestedActionPlan = {
  summary: string;
  steps: ActionPlanStep[];
  priority: RecommendationPriority;
};

/**
 * Objeto de saída EPIC-8 — recomendação prescritiva estruturada.
 * Requer aprovação humana antes de virar action item (acceptance do épico).
 */
export type ProcessRecommendation = {
  recommendationId: string;
  track: 'real' | 'simulation';
  tenantId: string;
  rootCause: RootCauseKind;
  problem: string;
  statisticalEvidence: StatisticalEvidence;
  /** Impacto financeiro estimado se a correção for aplicada (R$). */
  estimatedImpactBrl: number;
  actionPlan: SuggestedActionPlan;
  requiresHumanApproval: true;
  relatedAnomalyIds?: string[];
  model: {
    name: string;
    version: string;
  };
  generatedAt: string;
};

export type BatchAnomaly = {
  anomalyId: string;
  batchId: string;
  severity: AnomalySeverity;
  score: number;
  reason: string;
  metrics: {
    rejectionRate: number;
    totalAmountBrl: number;
    guideCount: number;
    zScoreRejection?: number;
    zScoreAmount?: number;
  };
};

export type RootCauseCluster = {
  kind: RootCauseKind;
  label: string;
  eventCount: number;
  amountAtRiskBrl: number;
  shareOfGlosaAmount: number;
  dominantCodes: string[];
  narrative: string;
};

export type PatternDetectionResult = {
  clusters: RootCauseCluster[];
  anomalies: BatchAnomaly[];
  periodSummary: {
    totalBilledBrl: number;
    totalGlosaAtRiskBrl: number;
    overallRejectionRate: number;
    guideVolume: number;
  };
};

export type ProcessOptimizerRunResult = {
  detection: PatternDetectionResult;
  recommendations: ProcessRecommendation[];
};
