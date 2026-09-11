import type { ProcessAggregationInput } from '../schemas/aggregation_input';
import type { RootCauseCluster } from '../schemas/recommendation_output';
import { RootCauseKind } from '../types';

const TISS_TO_ROOT: Array<{ pattern: RegExp; kind: RootCauseKind }> = [
  { pattern: /^1[0-4]/i, kind: RootCauseKind.CADASTRO_DIVERGENCE },
  { pattern: /cadast|benef|cnes|cnpj/i, kind: RootCauseKind.CADASTRO_DIVERGENCE },
  { pattern: /^2[0-4]|justif|clinic|laudo/i, kind: RootCauseKind.CLINICAL_JUSTIFICATION_MISSING },
  { pattern: /^5[0-4]|prazo|rn\s?510|ans/i, kind: RootCauseKind.REGULATORY_DEADLINE_BREACH },
  { pattern: /^3[0-4]|autori|senha/i, kind: RootCauseKind.AUTHORIZATION_DELAY },
  { pattern: /^4[0-4]|preco|tabela|valor|tuss/i, kind: RootCauseKind.PRICE_TABLE_MISMATCH },
  { pattern: /protocol|pertinen/i, kind: RootCauseKind.PROTOCOL_DEVIATION },
];

const LABELS: Record<RootCauseKind, string> = {
  [RootCauseKind.CADASTRO_DIVERGENCE]: 'Divergência cadastral',
  [RootCauseKind.CLINICAL_JUSTIFICATION_MISSING]: 'Ausência de justificativa clínica',
  [RootCauseKind.REGULATORY_DEADLINE_BREACH]: 'Estouro de prazo regulatório',
  [RootCauseKind.AUTHORIZATION_DELAY]: 'Atraso / falha de autorização',
  [RootCauseKind.PRICE_TABLE_MISMATCH]: 'Divergência de tabela / preço',
  [RootCauseKind.PROTOCOL_DEVIATION]: 'Desvio de protocolo',
  [RootCauseKind.OTHER]: 'Outras causas',
};

export function mapTissToRootCause(tissCode: string): RootCauseKind {
  const code = tissCode.trim();
  for (const rule of TISS_TO_ROOT) {
    if (rule.pattern.test(code)) return rule.kind;
  }
  return RootCauseKind.OTHER;
}

export function mapDeviationToRootCause(deviationType: string): RootCauseKind {
  return mapTissToRootCause(deviationType);
}

/**
 * Clusterização heurística de causas-raiz a partir de motivos TISS + desvios.
 * Preparado para substituir por embedding + k-means / HDBSCAN quando houver volume.
 */
export function clusterRootCauses(input: ProcessAggregationInput): RootCauseCluster[] {
  const buckets = new Map<
    RootCauseKind,
    { count: number; amount: number; codes: Map<string, number> }
  >();

  const ensure = (kind: RootCauseKind) => {
    let b = buckets.get(kind);
    if (!b) {
      b = { count: 0, amount: 0, codes: new Map() };
      buckets.set(kind, b);
    }
    return b;
  };

  for (const motif of input.glosaMotifs) {
    const kind = mapTissToRootCause(motif.tissCode);
    const b = ensure(kind);
    b.count += motif.count;
    b.amount += motif.amountAtRiskBrl;
    b.codes.set(motif.tissCode, (b.codes.get(motif.tissCode) ?? 0) + motif.count);
  }

  for (const dev of input.protocolDeviations) {
    const kind = mapDeviationToRootCause(dev.deviationType);
    const b = ensure(kind);
    b.count += dev.count;
    b.amount += dev.amountAtRiskBrl;
    const key = `${dev.protocolCode}:${dev.deviationType}`;
    b.codes.set(key, (b.codes.get(key) ?? 0) + dev.count);
  }

  // Autorização: se latência p95 elevada, reforça cluster AUTHORIZATION_DELAY
  const late = input.authorizationLatency.filter((a) => a.p95Hours >= 72);
  if (late.length > 0) {
    const b = ensure(RootCauseKind.AUTHORIZATION_DELAY);
    const samples = late.reduce((s, a) => s + a.sampleSize, 0);
    b.count += Math.max(samples, late.length);
    b.codes.set('auth_p95_ge_72h', (b.codes.get('auth_p95_ge_72h') ?? 0) + late.length);
  }

  const totalAmount = [...buckets.values()].reduce((s, b) => s + b.amount, 0) || 1;

  return [...buckets.entries()]
    .map(([kind, b]) => {
      const dominantCodes = [...b.codes.entries()]
        .sort((a, c) => c[1] - a[1])
        .slice(0, 5)
        .map(([code]) => code);
      return {
        kind,
        label: LABELS[kind],
        eventCount: b.count,
        amountAtRiskBrl: round2(b.amount),
        shareOfGlosaAmount: round4(b.amount / totalAmount),
        dominantCodes,
        narrative: `${LABELS[kind]} concentra ${Math.round((b.amount / totalAmount) * 100)}% do valor em risco no período (${b.count} eventos).`,
      } satisfies RootCauseCluster;
    })
    .sort((a, c) => c.amountAtRiskBrl - a.amountAtRiskBrl);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
