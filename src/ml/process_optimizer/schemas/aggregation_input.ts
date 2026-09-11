import type { DataTrack, TimeGranularity } from '../types';
import { TRACK_REAL } from '../types';

/** Série temporal de guias submetidas (agregação periódica). */
export type GuideSubmissionBucket = {
  bucketStart: string; // ISO date (início do bucket)
  submittedCount: number;
  billedAmountBrl: number;
  acceptedCount: number;
  rejectedCount: number;
};

/** Taxa de rejeição por operadora no período. */
export type OperatorRejectionRate = {
  /** Identificador interno do tenant (não exportar em federação). */
  operatorKey: string;
  operatorLabel?: string;
  submittedCount: number;
  rejectedCount: number;
  /** rejectionRate = rejected / submitted; validado em assertAggregationInput. */
  rejectionRate: number;
  glosaAmountBrl: number;
};

/** Motivos de glosa (códigos TISS) agregados. */
export type GlosaMotifAggregate = {
  tissCode: string;
  label?: string;
  count: number;
  amountAtRiskBrl: number;
};

/** Latência de autorização prévia. */
export type AuthorizationLatencyBucket = {
  bucketStart: string;
  sampleSize: number;
  p50Hours: number;
  p95Hours: number;
  avgHours: number;
};

/** Desvios de protocolo clínico/administrativo. */
export type ProtocolDeviationAggregate = {
  protocolCode: string;
  deviationType: string;
  count: number;
  amountAtRiskBrl: number;
};

/** Lote de faturamento para detecção de anomalias. */
export type BillingBatchSnapshot = {
  batchId: string;
  submittedAt: string;
  guideCount: number;
  totalAmountBrl: number;
  rejectionRate: number;
  operatorKey?: string;
};

/**
 * Schema de entrada para job periódico de EPIC-8.
 * Sempre tenant-scoped; `tenantId` é obrigatório no plano de dados (EPIC-7).
 */
export type ProcessAggregationInput = {
  track: DataTrack;
  tenantId: string;
  /** Janela de agregação. */
  period: {
    start: string;
    end: string;
    granularity: TimeGranularity;
  };
  guidesSubmittedSeries: GuideSubmissionBucket[];
  rejectionRatesByOperator: OperatorRejectionRate[];
  glosaMotifs: GlosaMotifAggregate[];
  authorizationLatency: AuthorizationLatencyBucket[];
  protocolDeviations: ProtocolDeviationAggregate[];
  billingBatches: BillingBatchSnapshot[];
  /** Metadados opcionais do job. */
  job?: {
    runId?: string;
    generatedAt?: string;
    source?: 'warehouse' | 'oltp_rollup' | 'fixture';
  };
};

export class AggregationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AggregationInputError';
  }
}

function assertNonNeg(n: number, field: string): void {
  if (!Number.isFinite(n) || n < 0) {
    throw new AggregationInputError(`${field} must be a finite non-negative number`);
  }
}

/**
 * Validação estrutural leve (sem Zod) — contrato do job de agregação.
 */
export function assertAggregationInput(input: ProcessAggregationInput): void {
  if (!input.tenantId?.trim()) {
    throw new AggregationInputError('tenantId is required (EPIC-7 isolation)');
  }
  if (input.track !== TRACK_REAL && input.track !== 'simulation') {
    throw new AggregationInputError('track must be real|simulation');
  }
  if (!input.period?.start || !input.period?.end) {
    throw new AggregationInputError('period.start and period.end are required');
  }
  if (input.period.start > input.period.end) {
    throw new AggregationInputError('period.start must be <= period.end');
  }

  for (const b of input.guidesSubmittedSeries ?? []) {
    assertNonNeg(b.submittedCount, 'guidesSubmittedSeries.submittedCount');
    assertNonNeg(b.billedAmountBrl, 'guidesSubmittedSeries.billedAmountBrl');
  }
  for (const r of input.rejectionRatesByOperator ?? []) {
    assertNonNeg(r.submittedCount, 'rejectionRatesByOperator.submittedCount');
    assertNonNeg(r.rejectedCount, 'rejectionRatesByOperator.rejectedCount');
    if (r.submittedCount > 0) {
      const expected = r.rejectedCount / r.submittedCount;
      if (Math.abs(expected - r.rejectionRate) > 0.02) {
        throw new AggregationInputError(
          `rejectionRate inconsistent for operator ${r.operatorKey}`,
        );
      }
    }
  }
  for (const m of input.glosaMotifs ?? []) {
    if (!m.tissCode?.trim()) {
      throw new AggregationInputError('glosaMotifs.tissCode is required');
    }
    assertNonNeg(m.count, 'glosaMotifs.count');
  }
  for (const batch of input.billingBatches ?? []) {
    if (!batch.batchId?.trim()) {
      throw new AggregationInputError('billingBatches.batchId is required');
    }
    assertNonNeg(batch.guideCount, 'billingBatches.guideCount');
    assertNonNeg(batch.rejectionRate, 'billingBatches.rejectionRate');
  }
}
