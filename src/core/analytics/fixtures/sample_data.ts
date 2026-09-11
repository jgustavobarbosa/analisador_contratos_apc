import type {
  BilledLineItem,
  CatalogCrosswalkItem,
  ContractScoreInput,
  PeerPriceObservation,
  ProviderSegment,
} from '../types';
import type { AuthorizationRecord } from '../fraud_engine';

export const SAMPLE_CROSSWALK: CatalogCrosswalkItem[] = [
  {
    internalCode: 'TX-SALA-01',
    description: 'Taxa de sala cirúrgica (pacote)',
    tussCode: '60000500',
    tissCode: '18',
    simproCode: 'SIM-SALA-01',
    unit: 'un',
  },
  {
    internalCode: 'GAS-O2-L',
    description: 'Oxigênio medicinal (L) — membro de diária/sala',
    tussCode: '70705260',
    brasindiceCode: 'BR-O2-01',
    packageParentCode: 'TX-SALA-01',
    unit: 'L',
  },
  {
    internalCode: 'OPME-STENT-01',
    description: 'Stent coronário',
    tussCode: '48010080',
    simproCode: 'SIM-STENT-X',
    anvisaRegistry: '80123456789',
    unit: 'un',
  },
  {
    internalCode: 'DIARIA-UTI',
    description: 'Diária UTI',
    tussCode: '60000169',
    tissCode: '18',
    unit: 'dia',
  },
  {
    internalCode: 'CONS-ONCO',
    description: 'Consulta oncológica',
    tussCode: '10101012',
    unit: 'un',
  },
];

export const SAMPLE_PEER_PRICES: PeerPriceObservation[] = [
  { internalCode: 'OPME-STENT-01', tussCode: '48010080', amountBrl: 4200, providerSegment: 'HOSPITAL', region: 'Sudeste' },
  { internalCode: 'OPME-STENT-01', tussCode: '48010080', amountBrl: 4500, providerSegment: 'HOSPITAL', region: 'Sudeste' },
  { internalCode: 'OPME-STENT-01', tussCode: '48010080', amountBrl: 4300, providerSegment: 'HOSPITAL', region: 'Sudeste' },
  { internalCode: 'GAS-O2-L', tussCode: '70705260', amountBrl: 2.5, providerSegment: 'HOSPITAL', region: 'Sudeste' },
  { internalCode: 'DIARIA-UTI', tussCode: '60000169', amountBrl: 1800, providerSegment: 'HOSPITAL', region: 'Sudeste' },
  { internalCode: 'DIARIA-UTI', tussCode: '60000169', amountBrl: 1900, providerSegment: 'HOSPITAL', region: 'Sudeste' },
  { internalCode: 'CONS-ONCO', tussCode: '10101012', amountBrl: 220, providerSegment: 'ONCOLOGIA', region: 'Sudeste' },
];

export function sampleBilledLinesWithIssues(): BilledLineItem[] {
  return [
    {
      lineId: 'L1',
      internalCode: 'TX-SALA-01',
      tussCode: '60000500',
      chargedAmountBrl: 1200,
      quantity: 1,
      billedAt: '2026-03-01',
      guideId: 'G-100',
      authorizationCode: 'AUTH-100',
      surgicalPorte: 'medio',
      diariasCobradas: 2,
      complexity: 'media',
    },
    {
      lineId: 'L2',
      internalCode: 'GAS-O2-L',
      tussCode: '70705260',
      chargedAmountBrl: 80,
      quantity: 10,
      billedAt: '2026-03-01',
      guideId: 'G-100',
      complexity: 'baixa',
    },
    {
      lineId: 'L3',
      internalCode: 'OPME-STENT-01',
      tussCode: '48010080',
      chargedAmountBrl: 6200,
      quantity: 1,
      billedAt: '2026-03-02',
      guideId: 'G-101',
      authorizationCode: 'AUTH-100',
      complexity: 'alta',
    },
    {
      lineId: 'L4',
      internalCode: 'DIARIA-UTI',
      tussCode: '60000169',
      chargedAmountBrl: 9000,
      quantity: 5,
      billedAt: '2026-03-03',
      guideId: 'G-102',
      authorizationCode: 'AUTH-102',
      surgicalPorte: 'pequeno',
      diariasCobradas: 5,
      complexity: 'alta',
    },
    {
      lineId: 'L5',
      internalCode: 'OPME-STENT-01',
      tussCode: '48010080',
      chargedAmountBrl: 6100,
      quantity: 1,
      billedAt: '2026-03-04',
      guideId: 'G-103',
      authorizationCode: 'AUTH-999',
      complexity: 'alta',
    },
    {
      lineId: 'L6',
      internalCode: 'OPME-STENT-01',
      tussCode: '48010080',
      chargedAmountBrl: 6000,
      quantity: 1,
      billedAt: '2026-03-05',
      guideId: 'G-104',
      complexity: 'alta',
    },
    {
      lineId: 'L7',
      internalCode: 'UNKNOWN-X',
      chargedAmountBrl: 100,
      quantity: 1,
      billedAt: '2026-03-05',
      guideId: 'G-105',
      complexity: 'baixa',
    },
  ];
}

export const SAMPLE_AUTHORIZATIONS: AuthorizationRecord[] = [
  {
    authorizationCode: 'AUTH-100',
    allowedTussCodes: ['60000500', '10101012'],
    guideId: 'G-100',
    issuedAt: '2026-02-28',
  },
  {
    authorizationCode: 'AUTH-102',
    allowedTussCodes: ['60000169'],
    guideId: 'G-102',
    issuedAt: '2026-03-01',
  },
];

export function sampleContractsForSegment(
  segment: ProviderSegment = 'HOSPITAL',
): ContractScoreInput[] {
  return [
    {
      contractId: 'ctr-benchmark-alpha',
      label: 'Hospital Referência Alpha',
      providerSegment: segment,
      region: 'Sudeste',
      track: 'simulation',
      historicalGlosaRate: 0.06,
      priceVsNetworkIndex: 0.92,
      regulatoryComplianceScore: 0.94,
      avgDiscrepancyResolutionDays: 8,
      pendingAdditivesCount: 0,
      notableClauses: [
        {
          clauseCode: 'TX-SALA',
          title: 'Taxa de sala',
          contractValue: 1100,
          networkMedian: 1200,
        },
      ],
    },
    {
      contractId: 'ctr-santa-clara',
      label: 'Hospital Santa Clara',
      providerSegment: segment,
      region: 'Sudeste',
      track: 'simulation',
      historicalGlosaRate: 0.18,
      priceVsNetworkIndex: 1.18,
      regulatoryComplianceScore: 0.72,
      avgDiscrepancyResolutionDays: 28,
      pendingAdditivesCount: 3,
      notableClauses: [
        {
          clauseCode: 'TX-SALA',
          title: 'Taxa de sala',
          contractValue: 1416,
          networkMedian: 1200,
        },
        {
          clauseCode: 'DIARIA-ENF',
          title: 'Diária enfermagem',
          contractValue: 980,
          networkMedian: 820,
        },
      ],
    },
    {
      contractId: 'ctr-peer-beta',
      label: 'Hospital Peer Beta',
      providerSegment: segment,
      region: 'Sudeste',
      track: 'simulation',
      historicalGlosaRate: 0.11,
      priceVsNetworkIndex: 1.05,
      regulatoryComplianceScore: 0.85,
      avgDiscrepancyResolutionDays: 14,
      pendingAdditivesCount: 1,
      notableClauses: [
        {
          clauseCode: 'TX-SALA',
          title: 'Taxa de sala',
          contractValue: 1280,
          networkMedian: 1200,
        },
      ],
    },
  ];
}
