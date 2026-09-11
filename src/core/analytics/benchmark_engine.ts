import type {
  AnalyticsTrack,
  ContractScoreBreakdown,
  ContractScoreInput,
  ContractScoreResult,
  ProviderSegment,
  SegmentRankingResult,
} from './types';

/** Pesos oficiais do score de contrato (EPIC-10). */
export const CONTRACT_SCORE_WEIGHTS = {
  historicalGlosa: 0.3,
  priceCompetitiveness: 0.35,
  regulatoryCompliance: 0.15,
  discrepancyResolution: 0.2,
} as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Componente de preço: índice 1.0 = paridade; quanto mais acima, menor o score.
 * index 0.85 → ~1.0; 1.0 → 0.7; 1.2 → ~0.35; 1.5+ → ~0
 */
export function priceIndexToScore(priceVsNetworkIndex: number): number {
  const excess = Math.max(0, priceVsNetworkIndex - 0.85);
  return clamp01(1 - excess / 0.65);
}

/**
 * Resolução: 0 dias → 1.0; 30 dias → ~0.5; 60+ → baixo.
 * Penaliza também aditivos pendentes.
 */
export function resolutionToScore(
  avgDays: number,
  pendingAdditives: number,
): number {
  const dayScore = clamp01(1 - avgDays / 60);
  const pendingPenalty = clamp01(1 - pendingAdditives * 0.08);
  return clamp01(dayScore * 0.7 + pendingPenalty * 0.3);
}

/**
 * Calcula score 0–100 ponderado para um contrato.
 */
export function calculateContractScore(
  input: ContractScoreInput,
): ContractScoreResult {
  const glosaComponent = clamp01(1 - input.historicalGlosaRate);
  const priceComponent = priceIndexToScore(input.priceVsNetworkIndex);
  const complianceComponent = clamp01(input.regulatoryComplianceScore);
  const resolutionComponent = resolutionToScore(
    input.avgDiscrepancyResolutionDays,
    input.pendingAdditivesCount,
  );

  const breakdown: ContractScoreBreakdown = {
    glosaComponent: round1(glosaComponent * 100),
    priceComponent: round1(priceComponent * 100),
    complianceComponent: round1(complianceComponent * 100),
    resolutionComponent: round1(resolutionComponent * 100),
  };

  const score = round1(
    (glosaComponent * CONTRACT_SCORE_WEIGHTS.historicalGlosa +
      priceComponent * CONTRACT_SCORE_WEIGHTS.priceCompetitiveness +
      complianceComponent * CONTRACT_SCORE_WEIGHTS.regulatoryCompliance +
      resolutionComponent * CONTRACT_SCORE_WEIGHTS.discrepancyResolution) *
      100,
  );

  const marginLeakageNotes: string[] = [];
  const renegotiationOpportunities: string[] = [];

  if (input.priceVsNetworkIndex > 1.05) {
    const pct = ((input.priceVsNetworkIndex - 1) * 100).toFixed(0);
    marginLeakageNotes.push(
      `Tabela ${pct}% acima da média da rede no segmento ${input.providerSegment}.`,
    );
  }
  if (input.historicalGlosaRate > 0.12) {
    marginLeakageNotes.push(
      `Taxa histórica de glosa ${(input.historicalGlosaRate * 100).toFixed(1)}% — custo oculto de retrabalho.`,
    );
  }
  if (input.pendingAdditivesCount > 0) {
    marginLeakageNotes.push(
      `${input.pendingAdditivesCount} aditivo(s) pendente(s) elevam incerteza de vigência.`,
    );
  }

  for (const clause of input.notableClauses ?? []) {
    if (clause.networkMedian <= 0) continue;
    const above = (clause.contractValue - clause.networkMedian) / clause.networkMedian;
    if (above > 0.1) {
      renegotiationOpportunities.push(
        `Cláusula "${clause.title}" ${Math.round(above * 100)}% acima da média da rede` +
          (input.region ? ` na macrorregião ${input.region}` : '') +
          ` (${clause.clauseCode}).`,
      );
    }
  }

  if (
    renegotiationOpportunities.length === 0 &&
    input.priceVsNetworkIndex > 1.12
  ) {
    renegotiationOpportunities.push(
      'Revisar pacote de taxas/diárias vs. mediana CBHPM/SIMPRO da rede.',
    );
  }

  return {
    contractId: input.contractId,
    label: input.label,
    providerSegment: input.providerSegment,
    region: input.region,
    score,
    breakdown,
    isBenchmark: false,
    marginLeakageNotes,
    renegotiationOpportunities,
  };
}

/**
 * Ranking comparativo por segmento — marca o contrato benchmark (melhor prática).
 */
export function rankContractsBySegment(
  contracts: ContractScoreInput[],
  options: {
    segment: ProviderSegment;
    region?: string;
    track?: AnalyticsTrack;
  },
): SegmentRankingResult {
  const filtered = contracts.filter(
    (c) =>
      c.providerSegment === options.segment &&
      (options.region == null || c.region === options.region),
  );

  const scored = filtered
    .map((c) => calculateContractScore(c))
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    scored[0].isBenchmark = true;
  }

  return {
    track: options.track ?? 'simulation',
    segment: options.segment,
    region: options.region,
    benchmarkContractId: scored[0]?.contractId ?? '',
    benchmarkLabel: scored[0]?.label ?? '',
    ranking: scored,
    generatedAt: new Date().toISOString(),
  };
}

export class BenchmarkEngine {
  calculateContractScore(input: ContractScoreInput): ContractScoreResult {
    return calculateContractScore(input);
  }

  rankBySegment(
    contracts: ContractScoreInput[],
    segment: ProviderSegment,
    region?: string,
    track: AnalyticsTrack = 'simulation',
  ): SegmentRankingResult {
    return rankContractsBySegment(contracts, { segment, region, track });
  }
}
