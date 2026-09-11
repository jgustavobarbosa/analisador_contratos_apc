import { Injectable } from '@nestjs/common';
import {
  analyzeDemoProviderProfile,
  type AnalyticsBundle,
} from '../../core/analytics';
import {
  createContractDataProvider,
  DataProviderMode,
  DemoContractSummary,
  DemoProviderProfile,
  ProviderType,
} from '../../simulation';
import { PrismaService } from '../../prisma/prisma.service';

export type DemoProfileWithAnalytics = DemoProviderProfile & {
  analytics: AnalyticsBundle;
};

@Injectable()
export class DemoTrackService {
  constructor(private readonly prisma: PrismaService) {}

  private provider(mode: DataProviderMode, tenantId?: string) {
    if (mode === 'postgres') {
      if (!tenantId) {
        throw new Error('tenantId required for postgres mode');
      }
      return createContractDataProvider({
        mode: 'postgres',
        prisma: this.prisma,
        tenantId,
      });
    }
    return createContractDataProvider({ mode: 'mock' });
  }

  listProviderTypes(): ProviderType[] {
    return Object.values(ProviderType);
  }

  async listContracts(
    mode: DataProviderMode,
    tenantId?: string,
  ): Promise<DemoContractSummary[]> {
    return this.provider(mode, tenantId).listDemoContracts();
  }

  async profile(
    mode: DataProviderMode,
    providerType: ProviderType,
    tenantId?: string,
    opts?: { seed?: number; guideCount?: number },
  ): Promise<DemoProviderProfile> {
    return this.provider(mode, tenantId).getProviderProfile(providerType, opts);
  }

  async profileWithAnalytics(
    providerType: ProviderType,
    opts?: { seed?: number; guideCount?: number },
  ): Promise<DemoProfileWithAnalytics> {
    const profile = await this.profile('mock', providerType, undefined, opts);
    return {
      ...profile,
      analytics: analyzeDemoProviderProfile(profile),
    };
  }

  async analyticsOnly(
    providerType: ProviderType,
    opts?: { seed?: number; guideCount?: number },
  ): Promise<AnalyticsBundle> {
    const profile = await this.profile('mock', providerType, undefined, opts);
    return analyzeDemoProviderProfile(profile);
  }

  async bundle(
    mode: DataProviderMode,
    contractId: string,
    tenantId?: string,
  ): Promise<DemoProviderProfile | null> {
    return this.provider(mode, tenantId).getContractBundle(contractId);
  }
}
