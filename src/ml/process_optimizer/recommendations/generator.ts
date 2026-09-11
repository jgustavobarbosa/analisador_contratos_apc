import type { ProcessAggregationInput } from '../schemas/aggregation_input';
import type {
  PatternDetectionResult,
  ProcessRecommendation,
  RootCauseCluster,
} from '../schemas/recommendation_output';
import type { RecommendationPriority } from '../types';
import { RootCauseKind } from '../types';

const MODEL = { name: 'process-optimizer-heuristic', version: '0.1.0' } as const;

const ACTION_TEMPLATES: Record<
  RootCauseKind,
  { summary: string; steps: Array<{ description: string; ownerRole: string }> }
> = {
  [RootCauseKind.CADASTRO_DIVERGENCE]: {
    summary: 'Sincronizar cadastro beneficiário/prestador antes do envio TISS.',
    steps: [
      {
        description: 'Instituir checklist de divergência CNES/CNPJ/carteirinha no pré-faturamento.',
        ownerRole: 'faturamento',
      },
      {
        description: 'Automatizar reconciliação diária com base da operadora (quando disponível).',
        ownerRole: 'ti_saude',
      },
    ],
  },
  [RootCauseKind.CLINICAL_JUSTIFICATION_MISSING]: {
    summary: 'Padronizar justificativa clínica e anexos obrigatórios por TUSS.',
    steps: [
      {
        description: 'Bloquear guia sem laudo/justificativa quando o código exigir.',
        ownerRole: 'auditoria_clinica',
      },
      {
        description: 'Treinar times clínicos nos templates por operadora.',
        ownerRole: 'qualidade',
      },
    ],
  },
  [RootCauseKind.REGULATORY_DEADLINE_BREACH]: {
    summary: 'Reduzir estouro de prazos ANS/RN e SLA contratual.',
    steps: [
      {
        description: 'Criar fila prioritária para guias com prazo < 7 dias.',
        ownerRole: 'faturamento',
      },
      {
        description: 'Alertar compliance quando p95 de ciclo ultrapassar limiar regulatório.',
        ownerRole: 'compliance',
      },
    ],
  },
  [RootCauseKind.AUTHORIZATION_DELAY]: {
    summary: 'Acelerar ciclo de autorização prévia e renovação.',
    steps: [
      {
        description: 'Monitorar p95 de autorização e escalar operadora acima de 72h.',
        ownerRole: 'autorizacao',
      },
      {
        description: 'Pré-agendar renovações de pacotes home care / OPME.',
        ownerRole: 'operacoes',
      },
    ],
  },
  [RootCauseKind.PRICE_TABLE_MISMATCH]: {
    summary: 'Alinhar tabela vigente do dossiê com o faturamento enviado.',
    steps: [
      {
        description: 'Validar preço TUSS contra dossiê vivo (EPIC-2) no pré-envio.',
        ownerRole: 'faturamento',
      },
      {
        description: 'Revisar aditivos com vigência retroativa ainda não refletidos.',
        ownerRole: 'contratos',
      },
    ],
  },
  [RootCauseKind.PROTOCOL_DEVIATION]: {
    summary: 'Corrigir desvios de protocolo que geram glosa sistemática.',
    steps: [
      {
        description: 'Mapear protocolos com maior taxa de desvio e republicar SOP.',
        ownerRole: 'qualidade',
      },
      {
        description: 'Incluir gate de pertinência clínica no workflow da guia.',
        ownerRole: 'auditoria_clinica',
      },
    ],
  },
  [RootCauseKind.OTHER]: {
    summary: 'Investigar causas residuais com amostragem auditável.',
    steps: [
      {
        description: 'Amostrar 30 guias do cluster residual e classificar manualmente.',
        ownerRole: 'auditoria',
      },
    ],
  },
};

function priorityFor(cluster: RootCauseCluster): RecommendationPriority {
  if (cluster.shareOfGlosaAmount >= 0.35 || cluster.amountAtRiskBrl >= 100_000) {
    return 'critical';
  }
  if (cluster.shareOfGlosaAmount >= 0.2 || cluster.amountAtRiskBrl >= 40_000) {
    return 'high';
  }
  if (cluster.shareOfGlosaAmount >= 0.1) return 'medium';
  return 'low';
}

/**
 * Estimativa conservadora: assume recuperação de 40–70% do valor em risco do cluster
 * conforme share e presença de anomalias correlatas.
 */
function estimateImpactBrl(
  cluster: RootCauseCluster,
  anomalyBoost: number,
): number {
  const recovery = Math.min(0.7, 0.4 + cluster.shareOfGlosaAmount * 0.3 + anomalyBoost);
  return Math.round(cluster.amountAtRiskBrl * recovery * 100) / 100;
}

function stableId(tenantId: string, kind: RootCauseKind, periodEnd: string): string {
  const raw = `${tenantId}|${kind}|${periodEnd}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return `rec-${kind.toLowerCase()}-${h.toString(16)}`;
}

/**
 * Gera recomendações prescritivas a partir dos padrões detectados.
 */
export function generateProcessRecommendations(
  input: ProcessAggregationInput,
  detection: PatternDetectionResult,
  options: { maxRecommendations?: number; minShare?: number } = {},
): ProcessRecommendation[] {
  const max = options.maxRecommendations ?? 5;
  const minShare = options.minShare ?? 0.05;
  const anomalyBoost = detection.anomalies.some((a) => a.severity !== 'info')
    ? 0.08
    : 0;

  const baselineRejection = detection.periodSummary.overallRejectionRate;
  const now = input.job?.generatedAt ?? new Date().toISOString();

  return detection.clusters
    .filter((c) => c.shareOfGlosaAmount >= minShare && c.eventCount > 0)
    .slice(0, max)
    .map((cluster) => {
      const tpl = ACTION_TEMPLATES[cluster.kind];
      const priority = priorityFor(cluster);
      const impact = estimateImpactBrl(cluster, anomalyBoost);
      const observedShare = cluster.shareOfGlosaAmount;

      return {
        recommendationId: stableId(input.tenantId, cluster.kind, input.period.end),
        track: input.track,
        tenantId: input.tenantId,
        rootCause: cluster.kind,
        problem: cluster.narrative,
        statisticalEvidence: {
          sampleSize: cluster.eventCount,
          metric: 'share_of_glosa_amount',
          baseline: Math.max(baselineRejection, 0.05),
          observed: observedShare,
          liftPct: round4(observedShare - Math.max(baselineRejection, 0.05)),
          confidence: Math.min(0.92, 0.55 + Math.log10(cluster.eventCount + 1) * 0.12),
          supportingCodes: cluster.dominantCodes,
        },
        estimatedImpactBrl: impact,
        actionPlan: {
          summary: tpl.summary,
          priority,
          steps: tpl.steps.map((s, i) => ({
            order: i + 1,
            description: s.description,
            ownerRole: s.ownerRole,
          })),
        },
        requiresHumanApproval: true as const,
        relatedAnomalyIds: detection.anomalies
          .filter((a) => a.severity !== 'info')
          .slice(0, 3)
          .map((a) => a.anomalyId),
        model: { ...MODEL },
        generatedAt: now,
      } satisfies ProcessRecommendation;
    });
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
