/**
 * EPIC-7 / EPIC-9 — agregação multi-tenant anônima e gancho para aprendizado federado.
 *
 * Regras:
 * - Control plane NUNCA recebe guias/beneficiários/PII.
 * - Cross-tenant: apenas estatísticas agregadas + histogramas discretizados.
 * - tenantId é hasheado com salt de plataforma (não reversível no peer).
 */

import { createHash } from 'crypto';
import type { ProcessAggregationInput } from '../schemas/aggregation_input';
import type { PatternDetectionResult } from '../schemas/recommendation_output';
import { RootCauseKind } from '../types';

export type AnonymousTenantRef = {
  /** HMAC/SHA256 truncado — não é o tenantId em claro. */
  tenantHash: string;
  /** Segmento opaco (ex.: porte/tipo prestador) — sem CNPJ. */
  segmentCode?: string;
};

export type FederatedRootCauseHistogram = {
  kind: RootCauseKind;
  eventCount: number;
  amountAtRiskBrlBucket: number; // arredondado p/ buckets de R$ 1.000
  shareOfGlosaAmount: number;
};

export type FederatedTenantContribution = {
  tenant: AnonymousTenantRef;
  period: { start: string; end: string };
  guideVolume: number;
  overallRejectionRate: number;
  totalBilledBrlBucket: number;
  rootCauseHistogram: FederatedRootCauseHistogram[];
  anomalyCount: number;
  /** Versão do esquema de features — compatibilidade FedAvg futura. */
  featureSchemaVersion: string;
};

export type FederatedAggregateSnapshot = {
  contributorCount: number;
  period: { start: string; end: string };
  meanRejectionRate: number;
  rootCauseBenchmarks: Array<{
    kind: RootCauseKind;
    meanShare: number;
    p50Share: number;
    contributorCount: number;
  }>;
  featureSchemaVersion: string;
};

export const FEDERATED_FEATURE_SCHEMA_VERSION = 'epic8-anon-v1';

function bucketAmount(brl: number, step = 1000): number {
  return Math.round(brl / step) * step;
}

export function hashTenantId(tenantId: string, platformSalt: string): string {
  return createHash('sha256')
    .update(`${platformSalt}|${tenantId}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Converte resultado tenant-local em contribuição anônima (sem PII / sem IDs de guia).
 */
export function toFederatedContribution(
  input: ProcessAggregationInput,
  detection: PatternDetectionResult,
  options: { platformSalt: string; segmentCode?: string },
): FederatedTenantContribution {
  if (!options.platformSalt?.trim()) {
    throw new Error('platformSalt is required for anonymous hashing (EPIC-9)');
  }

  return {
    tenant: {
      tenantHash: hashTenantId(input.tenantId, options.platformSalt),
      segmentCode: options.segmentCode,
    },
    period: { start: input.period.start, end: input.period.end },
    guideVolume: detection.periodSummary.guideVolume,
    overallRejectionRate: detection.periodSummary.overallRejectionRate,
    totalBilledBrlBucket: bucketAmount(detection.periodSummary.totalBilledBrl),
    rootCauseHistogram: detection.clusters.map((c) => ({
      kind: c.kind,
      eventCount: c.eventCount,
      amountAtRiskBrlBucket: bucketAmount(c.amountAtRiskBrl),
      shareOfGlosaAmount: c.shareOfGlosaAmount,
    })),
    anomalyCount: detection.anomalies.length,
    featureSchemaVersion: FEDERATED_FEATURE_SCHEMA_VERSION,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

/**
 * Agrega contribuições anônimas de múltiplos tenants (benchmark).
 * Não reconstrói dados brutos.
 */
export function aggregateFederatedContributions(
  contributions: FederatedTenantContribution[],
): FederatedAggregateSnapshot {
  if (contributions.length === 0) {
    return {
      contributorCount: 0,
      period: { start: '', end: '' },
      meanRejectionRate: 0,
      rootCauseBenchmarks: [],
      featureSchemaVersion: FEDERATED_FEATURE_SCHEMA_VERSION,
    };
  }

  const meanRejectionRate =
    contributions.reduce((s, c) => s + c.overallRejectionRate, 0) /
    contributions.length;

  const byKind = new Map<RootCauseKind, number[]>();
  for (const c of contributions) {
    for (const h of c.rootCauseHistogram) {
      const arr = byKind.get(h.kind) ?? [];
      arr.push(h.shareOfGlosaAmount);
      byKind.set(h.kind, arr);
    }
  }

  const rootCauseBenchmarks = [...byKind.entries()].map(([kind, shares]) => {
    const sorted = [...shares].sort((a, b) => a - b);
    const meanShare = shares.reduce((s, x) => s + x, 0) / shares.length;
    return {
      kind,
      meanShare: Math.round(meanShare * 10000) / 10000,
      p50Share: Math.round(percentile(sorted, 0.5) * 10000) / 10000,
      contributorCount: shares.length,
    };
  });

  return {
    contributorCount: contributions.length,
    period: {
      start: contributions.map((c) => c.period.start).sort()[0],
      end: contributions.map((c) => c.period.end).sort().at(-1) ?? '',
    },
    meanRejectionRate: Math.round(meanRejectionRate * 10000) / 10000,
    rootCauseBenchmarks,
    featureSchemaVersion: FEDERATED_FEATURE_SCHEMA_VERSION,
  };
}

/**
 * Gancho para aprendizado federado futuro (FedAvg / secure aggregation).
 * Nesta versão só valida schema e isola pesos — sem treino real.
 */
export type FederatedModelUpdate = {
  featureSchemaVersion: string;
  roundId: string;
  /** Pesos opacos do modelo local — nunca incluir features com PII. */
  opaqueWeights: Float64Array | number[];
  sampleSize: number;
  tenantHash: string;
};

export interface FederatedLearningAdapter {
  readonly name: string;
  canAccept(update: FederatedModelUpdate): boolean;
  enqueueLocalUpdate(update: FederatedModelUpdate): void;
}

export class NullFederatedLearningAdapter implements FederatedLearningAdapter {
  readonly name = 'null-federated-v0';
  private readonly queue: FederatedModelUpdate[] = [];

  canAccept(update: FederatedModelUpdate): boolean {
    return (
      update.featureSchemaVersion === FEDERATED_FEATURE_SCHEMA_VERSION &&
      update.sampleSize > 0 &&
      Boolean(update.tenantHash) &&
      !('tenantId' in (update as object))
    );
  }

  enqueueLocalUpdate(update: FederatedModelUpdate): void {
    if (!this.canAccept(update)) {
      throw new Error('Federated update rejected: schema or isolation violation');
    }
    this.queue.push(update);
  }

  /** Introspecção de testes — tamanho da fila. */
  pendingCount(): number {
    return this.queue.length;
  }
}
