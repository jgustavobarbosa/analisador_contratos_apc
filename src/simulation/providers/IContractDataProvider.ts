/**
 * TRACK SIMULATION / REAL switch — contract data access port.
 */

import {
  DataProviderMode,
  DemoContractSummary,
  DemoProviderProfile,
  ProviderType,
} from '../types';

export interface IContractDataProvider {
  readonly mode: DataProviderMode;

  listDemoContracts(): Promise<DemoContractSummary[]>;

  getProviderProfile(
    providerType: ProviderType,
    options?: { seed?: number; guideCount?: number },
  ): Promise<DemoProviderProfile>;

  /**
   * REAL path: load dossier-oriented summary by contract id.
   * MOCK path: resolves synthetic contract ids like `sim:HOSPITAL`.
   */
  getContractBundle(contractId: string): Promise<DemoProviderProfile | null>;
}
