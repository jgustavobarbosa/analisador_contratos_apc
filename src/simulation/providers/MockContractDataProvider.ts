import { generateProviderProfile } from '../provider_generator';
import {
  DemoContractSummary,
  DemoProviderProfile,
  ProviderType,
  TRACK_SIMULATION,
} from '../types';
import type { IContractDataProvider } from './IContractDataProvider';

const SIM_PREFIX = 'sim:';

export class MockContractDataProvider implements IContractDataProvider {
  readonly mode = 'mock' as const;

  async listDemoContracts(): Promise<DemoContractSummary[]> {
    return Object.values(ProviderType).map((providerType) => {
      const profile = generateProviderProfile(providerType, { seed: 42, guideCount: 1 });
      return {
        track: TRACK_SIMULATION,
        contractId: `${SIM_PREFIX}${providerType}`,
        providerType,
        title: `Demo ${providerType} — ${profile.party.legalName}`,
        partyA: profile.party.legalName,
        partyB: 'Operadora Demo Saúde S.A.',
      };
    });
  }

  async getProviderProfile(
    providerType: ProviderType,
    options?: { seed?: number; guideCount?: number },
  ): Promise<DemoProviderProfile> {
    return generateProviderProfile(providerType, {
      seed: options?.seed ?? 42,
      guideCount: options?.guideCount ?? 20,
    });
  }

  async getContractBundle(contractId: string): Promise<DemoProviderProfile | null> {
    if (!contractId.startsWith(SIM_PREFIX)) return null;
    const raw = contractId.slice(SIM_PREFIX.length) as ProviderType;
    if (!Object.values(ProviderType).includes(raw)) return null;
    return this.getProviderProfile(raw);
  }
}
