import type { PrismaClient } from '@prisma/client';
import {
  DemoContractSummary,
  DemoProviderProfile,
  ProviderType,
} from '../types';
import type { IContractDataProvider } from './IContractDataProvider';

/**
 * REAL-oriented adapter. Reads tenant contracts from Postgres (Prisma).
 * Does NOT invent glosa/SHAP — those remain simulation-only via Mock provider.
 * Profile shape is a best-effort projection for UI parity; missing demo slices are empty.
 */
export class PostgresContractDataProvider implements IContractDataProvider {
  readonly mode = 'postgres' as const;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async listDemoContracts(): Promise<DemoContractSummary[]> {
    const rows = await this.prisma.contract.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((c) => ({
      track: 'real' as const,
      contractId: c.id,
      providerType: ProviderType.CLINICA,
      title: c.title ?? `${c.partyA} × ${c.partyB}`,
      partyA: c.partyA,
      partyB: c.partyB,
    }));
  }

  async getProviderProfile(
    _providerType: ProviderType,
  ): Promise<DemoProviderProfile> {
    throw new Error(
      'PostgresContractDataProvider.getProviderProfile is not supported — use getContractBundle(contractId) for REAL data or MockContractDataProvider for synthetic profiles.',
    );
  }

  async getContractBundle(contractId: string): Promise<DemoProviderProfile | null> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId: this.tenantId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { coverageItems: true, priceItems: true },
        },
        documents: { orderBy: { uploadedAt: 'asc' } },
      },
    });
    if (!contract) return null;

    const latest = contract.versions[0];
    return {
      track: 'real',
      providerType: ProviderType.CLINICA,
      generatedAt: new Date().toISOString(),
      seed: 0,
      party: {
        legalName: contract.partyA,
        cnpjFake: 'REAL-TENANT',
        cnesFake: 'REAL',
        focus: 'Dados reais do dossiê — fatias EPIC-4/8 demo não se aplicam',
      },
      dossier: {
        activeClauses: [
          {
            code: 'REAL_CONTRACT',
            title: contract.title ?? 'Contrato',
            text: `${contract.partyA} × ${contract.partyB}`,
            ansReajusteLimitPct: 0,
          },
        ],
        additives: contract.documents.map((d, i) => ({
          version: i + 1,
          title: d.title,
          effectiveAt: d.uploadedAt.toISOString().slice(0, 10),
          signedAt: d.uploadedAt.toISOString().slice(0, 10),
          summary: `Documento ${d.type} (REAL)`,
          extractedFields: [],
        })),
        coverageCodes:
          latest?.coverageItems.map((c) => ({
            code: c.code,
            action: c.action,
            effectiveAt: c.effectiveAt.toISOString().slice(0, 10),
          })) ?? [],
        priceTable:
          latest?.priceItems.map((p) => ({
            code: p.code,
            amount: Number(p.amount),
            currency: 'BRL' as const,
            effectiveAt: p.effectiveAt.toISOString().slice(0, 10),
          })) ?? [],
      },
      guides: [],
      regulatoryAlerts: [],
      processDiagnosis: {
        model: 'simulation-nn-proxy-v1',
        bottleneck: 'N/A em modo Postgres — use Mock para diagnóstico EPIC-8',
        estimatedMonthlyLossPct: 0,
        recommendation: 'Alterne para MockContractDataProvider para demo EPIC-8.',
        confidence: 0,
      },
      qualityScorecard: {
        overallScore: 0,
        scoreByDimension: {},
        totalEstimatedSavings: 0,
        improvementPoints: [],
        checklist: [],
        checklistCount: 0,
        formula:
          '0.35*FINANCEIRO + 0.25*REGULATORIO_ANS + 0.25*OPERACIONAL + 0.15*JURIDICO',
      },
    };
  }
}
