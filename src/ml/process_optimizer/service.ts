import {
  assertAggregationInput,
  type ProcessAggregationInput,
} from './schemas/aggregation_input';
import type { ProcessOptimizerRunResult } from './schemas/recommendation_output';
import { detectOperationalPatterns } from './detectors/pattern_detector';
import { generateProcessRecommendations } from './recommendations/generator';
import {
  aggregateFederatedContributions,
  toFederatedContribution,
  type FederatedAggregateSnapshot,
  type FederatedLearningAdapter,
  type FederatedTenantContribution,
  NullFederatedLearningAdapter,
} from './federation/anonymous_aggregate';

export type ProcessOptimizerServiceOptions = {
  federatedAdapter?: FederatedLearningAdapter;
  platformSalt?: string;
  maxRecommendations?: number;
};

/**
 * Fachada EPIC-8 — agregação tenant-local → padrões → recomendações.
 * Federação é opt-in e sempre anônima.
 */
export class ProcessOptimizerService {
  private readonly federated: FederatedLearningAdapter;
  private readonly platformSalt: string;
  private readonly maxRecommendations: number;

  constructor(options: ProcessOptimizerServiceOptions = {}) {
    this.federated = options.federatedAdapter ?? new NullFederatedLearningAdapter();
    this.platformSalt = options.platformSalt ?? 'rayia-dev-salt-change-me';
    this.maxRecommendations = options.maxRecommendations ?? 5;
  }

  run(input: ProcessAggregationInput): ProcessOptimizerRunResult {
    assertAggregationInput(input);
    const detection = detectOperationalPatterns(input);
    const recommendations = generateProcessRecommendations(input, detection, {
      maxRecommendations: this.maxRecommendations,
    });
    return { detection, recommendations };
  }

  /**
   * Exporta contribuição anônima para benchmark multi-tenant (não envia PII).
   */
  exportAnonymousContribution(
    input: ProcessAggregationInput,
    segmentCode?: string,
  ): FederatedTenantContribution {
    const { detection } = this.run(input);
    return toFederatedContribution(input, detection, {
      platformSalt: this.platformSalt,
      segmentCode,
    });
  }

  aggregatePeers(
    contributions: FederatedTenantContribution[],
  ): FederatedAggregateSnapshot {
    return aggregateFederatedContributions(contributions);
  }

  get federatedAdapter(): FederatedLearningAdapter {
    return this.federated;
  }
}
