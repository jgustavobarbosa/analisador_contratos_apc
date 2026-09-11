import type { ProcessAggregationInput } from '../schemas/aggregation_input';
import type {
  PatternDetectionResult,
} from '../schemas/recommendation_output';
import {
  detectBillingBatchAnomalies,
  type AnomalyScorer,
  ZScoreAnomalyScorer,
} from './batch_anomaly_detector';
import { clusterRootCauses } from './root_cause_clusterer';

export type PatternDetectorOptions = {
  anomalyScorer?: AnomalyScorer;
  zThreshold?: number;
};

/**
 * Orquestra clusterização de causas-raiz + anomalias de lote.
 */
export function detectOperationalPatterns(
  input: ProcessAggregationInput,
  options: PatternDetectorOptions = {},
): PatternDetectionResult {
  const scorer =
    options.anomalyScorer ??
    new ZScoreAnomalyScorer(options.zThreshold ?? 3.5);

  const clusters = clusterRootCauses(input);
  const anomalies =
    options.anomalyScorer != null
      ? scorer.scoreBatches(input)
      : detectBillingBatchAnomalies(input, { zThreshold: options.zThreshold });

  const totalBilledBrl = input.guidesSubmittedSeries.reduce(
    (s, b) => s + b.billedAmountBrl,
    0,
  );
  const guideVolume = input.guidesSubmittedSeries.reduce(
    (s, b) => s + b.submittedCount,
    0,
  );
  const rejected = input.guidesSubmittedSeries.reduce(
    (s, b) => s + b.rejectedCount,
    0,
  );
  const totalGlosaAtRiskBrl = input.glosaMotifs.reduce(
    (s, m) => s + m.amountAtRiskBrl,
    0,
  );

  return {
    clusters,
    anomalies,
    periodSummary: {
      totalBilledBrl: round2(totalBilledBrl),
      totalGlosaAtRiskBrl: round2(totalGlosaAtRiskBrl),
      overallRejectionRate: guideVolume > 0 ? round4(rejected / guideVolume) : 0,
      guideVolume,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
