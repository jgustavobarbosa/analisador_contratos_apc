import type { ProcessAggregationInput } from '../schemas/aggregation_input';
import type { BatchAnomaly } from '../schemas/recommendation_output';
import type { AnomalySeverity } from '../types';

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** Modified z-score (Iglewicz & Hoaglin) — robusto a outliers no próprio lote. */
function modifiedZScores(xs: number[]): number[] {
  const med = median(xs);
  const absDev = xs.map((x) => Math.abs(x - med));
  const mad = median(absDev);
  if (mad <= 1e-12) {
    return xs.map((x) => (x === med ? 0 : 3.5));
  }
  return xs.map((x) => (0.6745 * (x - med)) / mad);
}

function severityFromScore(absZ: number): AnomalySeverity {
  if (absZ >= 5) return 'critical';
  if (absZ >= 3.5) return 'warning';
  return 'info';
}

/**
 * Detecção de anomalias em lotes de faturamento via modified z-score (MAD).
 * Interface pronta para Isolation Forest / autoencoder (swap do scorer).
 */
export function detectBillingBatchAnomalies(
  input: ProcessAggregationInput,
  options: { zThreshold?: number } = {},
): BatchAnomaly[] {
  const threshold = options.zThreshold ?? 3.5;
  const batches = input.billingBatches ?? [];
  if (batches.length < 3) {
    return [];
  }

  const zRejection = modifiedZScores(batches.map((b) => b.rejectionRate));
  const zAmount = modifiedZScores(batches.map((b) => b.totalAmountBrl));

  const anomalies: BatchAnomaly[] = [];

  batches.forEach((batch, i) => {
    const zR = zRejection[i];
    const zA = zAmount[i];
    const score = Math.max(Math.abs(zR), Math.abs(zA));
    if (score < threshold) return;

    const reasons: string[] = [];
    if (Math.abs(zR) >= threshold) {
      reasons.push(
        `taxa de rejeição ${(batch.rejectionRate * 100).toFixed(1)}% (mod-z=${zR.toFixed(2)})`,
      );
    }
    if (Math.abs(zA) >= threshold) {
      reasons.push(
        `volume R$ ${batch.totalAmountBrl.toFixed(0)} (mod-z=${zA.toFixed(2)})`,
      );
    }

    anomalies.push({
      anomalyId: `anom-${batch.batchId}`,
      batchId: batch.batchId,
      severity: severityFromScore(score),
      score: Math.round(score * 1000) / 1000,
      reason: `Lote anômalo: ${reasons.join('; ')}`,
      metrics: {
        rejectionRate: batch.rejectionRate,
        totalAmountBrl: batch.totalAmountBrl,
        guideCount: batch.guideCount,
        zScoreRejection: Math.round(zR * 1000) / 1000,
        zScoreAmount: Math.round(zA * 1000) / 1000,
      },
    });
  });

  return anomalies.sort((a, b) => b.score - a.score);
}

/** Contrato futuro para scorers ML (Isolation Forest, AE). */
export interface AnomalyScorer {
  readonly name: string;
  scoreBatches(input: ProcessAggregationInput): BatchAnomaly[];
}

export class ZScoreAnomalyScorer implements AnomalyScorer {
  readonly name = 'modified-zscore-mad-v1';
  constructor(private readonly zThreshold = 3.5) {}
  scoreBatches(input: ProcessAggregationInput): BatchAnomaly[] {
    return detectBillingBatchAnomalies(input, { zThreshold: this.zThreshold });
  }
}
