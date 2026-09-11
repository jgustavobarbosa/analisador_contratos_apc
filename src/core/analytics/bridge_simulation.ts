import type { DemoProviderProfile, ProviderType } from '../../simulation/types';
import { CatalogEngine } from './catalog_engine';
import { BenchmarkEngine } from './benchmark_engine';
import { FraudDetectionEngine } from './fraud_engine';
import {
  SAMPLE_AUTHORIZATIONS,
  SAMPLE_CROSSWALK,
  SAMPLE_PEER_PRICES,
  sampleBilledLinesWithIssues,
  sampleContractsForSegment,
} from './fixtures/sample_data';
import type {
  AnalyticsBundle,
  ContractScoreInput,
  ProviderSegment,
} from './types';

function toSegment(providerType: ProviderType): ProviderSegment {
  return providerType;
}

/**
 * Integra motores EPIC-10/11 ao perfil do gerador de simulação.
 * Não grava em tabelas de produção.
 */
export function analyzeDemoProviderProfile(
  profile: DemoProviderProfile,
): AnalyticsBundle {
  const catalog = new CatalogEngine(SAMPLE_CROSSWALK);
  const fraud = new FraudDetectionEngine();
  const benchmark = new BenchmarkEngine();

  const lines = sampleBilledLinesWithIssues().map((l, i) => ({
    ...l,
    // amarra volume ao seed implícito do perfil
    chargedAmountBrl:
      l.chargedAmountBrl *
      (1 + (profile.guides[i % profile.guides.length]?.glosaProbability ?? 0) * 0.05),
  }));

  const catalogAlerts = catalog.validateBilling(lines, SAMPLE_PEER_PRICES);
  const fraudAlerts = fraud.scan(lines, SAMPLE_AUTHORIZATIONS);

  const segment = toSegment(profile.providerType);
  const peers = sampleContractsForSegment(segment).map((c) =>
    adaptPeerToProfile(c, profile),
  );

  const ranking = benchmark.rankBySegment(
    peers,
    segment,
    peers[0]?.region,
    'simulation',
  );

  return {
    track: 'simulation',
    catalogAlerts,
    ranking,
    fraudAlerts,
  };
}

function adaptPeerToProfile(
  base: ContractScoreInput,
  profile: DemoProviderProfile,
): ContractScoreInput {
  if (!base.contractId.includes('santa-clara') && base.label !== profile.party.legalName) {
    return base;
  }
  const highGlosa =
    profile.guides.filter((g) => g.glosaRiskLevel === 'high').length /
    Math.max(profile.guides.length, 1);
  return {
    ...base,
    label: profile.party.legalName,
    historicalGlosaRate: Math.max(base.historicalGlosaRate, highGlosa),
    pendingAdditivesCount: Math.max(
      base.pendingAdditivesCount,
      profile.dossier.additives.length > 2 ? 2 : 0,
    ),
    regulatoryComplianceScore: Math.min(
      base.regulatoryComplianceScore,
      1 -
        profile.regulatoryAlerts.filter((a) => a.severity === 'critical').length *
          0.08,
    ),
  };
}

/** Fachada única para jobs REAL (quando o warehouse alimentar os inputs). */
export class AnalyticsOrchestrator {
  constructor(
    private readonly catalog = new CatalogEngine(SAMPLE_CROSSWALK),
    private readonly benchmark = new BenchmarkEngine(),
    private readonly fraud = new FraudDetectionEngine(),
  ) {}

  get catalogEngine(): CatalogEngine {
    return this.catalog;
  }

  get benchmarkEngine(): BenchmarkEngine {
    return this.benchmark;
  }

  get fraudEngine(): FraudDetectionEngine {
    return this.fraud;
  }

  runSimulationBundle(profile: DemoProviderProfile): AnalyticsBundle {
    return analyzeDemoProviderProfile(profile);
  }
}
