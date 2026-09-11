import type { ProcessAggregationInput } from '../schemas/aggregation_input';
import { TRACK_REAL } from '../types';

/**
 * Fixture determinística para testes unitários (TRACK REAL rotulado como fixture).
 * Não usar como seed de produção.
 */
export function buildFixtureAggregation(
  overrides: Partial<ProcessAggregationInput> = {},
): ProcessAggregationInput {
  const base: ProcessAggregationInput = {
    track: TRACK_REAL,
    tenantId: 'tenant-fixture-santa-clara',
    period: {
      start: '2026-01-01',
      end: '2026-03-31',
      granularity: 'month',
    },
    guidesSubmittedSeries: [
      {
        bucketStart: '2026-01-01',
        submittedCount: 1200,
        billedAmountBrl: 2_400_000,
        acceptedCount: 1020,
        rejectedCount: 180,
      },
      {
        bucketStart: '2026-02-01',
        submittedCount: 1100,
        billedAmountBrl: 2_200_000,
        acceptedCount: 935,
        rejectedCount: 165,
      },
      {
        bucketStart: '2026-03-01',
        submittedCount: 1300,
        billedAmountBrl: 2_600_000,
        acceptedCount: 1079,
        rejectedCount: 221,
      },
    ],
    rejectionRatesByOperator: [
      {
        operatorKey: 'op-unimed',
        operatorLabel: 'Unimed',
        submittedCount: 2000,
        rejectedCount: 360,
        rejectionRate: 0.18,
        glosaAmountBrl: 420_000,
      },
      {
        operatorKey: 'op-bradesco',
        operatorLabel: 'Bradesco',
        submittedCount: 1600,
        rejectedCount: 206,
        rejectionRate: 0.12875,
        glosaAmountBrl: 210_000,
      },
    ],
    glosaMotifs: [
      {
        tissCode: '1011',
        label: 'Divergência cadastral beneficiário',
        count: 140,
        amountAtRiskBrl: 280_000,
      },
      {
        tissCode: '2014',
        label: 'Justificativa clínica ausente',
        count: 90,
        amountAtRiskBrl: 190_000,
      },
      {
        tissCode: '5010',
        label: 'Prazo regulatório excedido',
        count: 45,
        amountAtRiskBrl: 95_000,
      },
      {
        tissCode: '4012',
        label: 'Valor incompatível com tabela',
        count: 30,
        amountAtRiskBrl: 65_000,
      },
    ],
    authorizationLatency: [
      {
        bucketStart: '2026-01-01',
        sampleSize: 200,
        p50Hours: 24,
        p95Hours: 80,
        avgHours: 36,
      },
      {
        bucketStart: '2026-02-01',
        sampleSize: 180,
        p50Hours: 28,
        p95Hours: 96,
        avgHours: 40,
      },
    ],
    protocolDeviations: [
      {
        protocolCode: 'PROT-ONCO-01',
        deviationType: 'protocol_pertinencia',
        count: 22,
        amountAtRiskBrl: 48_000,
      },
    ],
    billingBatches: [
      {
        batchId: 'batch-01',
        submittedAt: '2026-01-10',
        guideCount: 400,
        totalAmountBrl: 800_000,
        rejectionRate: 0.12,
      },
      {
        batchId: 'batch-02',
        submittedAt: '2026-01-20',
        guideCount: 420,
        totalAmountBrl: 820_000,
        rejectionRate: 0.14,
      },
      {
        batchId: 'batch-03',
        submittedAt: '2026-02-05',
        guideCount: 390,
        totalAmountBrl: 790_000,
        rejectionRate: 0.13,
      },
      {
        batchId: 'batch-04',
        submittedAt: '2026-02-18',
        guideCount: 410,
        totalAmountBrl: 810_000,
        rejectionRate: 0.15,
      },
      {
        batchId: 'batch-spike',
        submittedAt: '2026-03-12',
        guideCount: 450,
        totalAmountBrl: 1_900_000,
        rejectionRate: 0.42,
      },
    ],
    job: {
      runId: 'fixture-run-1',
      generatedAt: '2026-04-01T12:00:00.000Z',
      source: 'fixture',
    },
  };

  return { ...base, ...overrides };
}
