/**
 * EPIC-8 — Motor de recomendações de processo (TRACK REAL).
 *
 * @example
 * ```ts
 * import { ProcessOptimizerService, buildFixtureAggregation } from '../ml/process_optimizer';
 * const svc = new ProcessOptimizerService({ platformSalt: process.env.FED_SALT! });
 * const result = svc.run(buildFixtureAggregation());
 * ```
 */

export * from './types';
export * from './schemas/aggregation_input';
export * from './schemas/recommendation_output';
export * from './detectors/root_cause_clusterer';
export * from './detectors/batch_anomaly_detector';
export * from './detectors/pattern_detector';
export * from './recommendations/generator';
export * from './federation/anonymous_aggregate';
export * from './service';
export * from './fixtures/sample_aggregation';
