export * from './types';
export * from './provider_generator';
export * from './quality_scorecard';
export type { IContractDataProvider } from './providers/IContractDataProvider';
export { MockContractDataProvider } from './providers/MockContractDataProvider';
export { PostgresContractDataProvider } from './providers/PostgresContractDataProvider';
export { createContractDataProvider } from './providers/createContractDataProvider';

// Legacy thin helpers (still simulation-only)
export {
  generateGuide,
  generateBatch,
  type SimulationGuide,
  type ProviderType as LegacyProviderType,
} from './generators/provider-guide';
