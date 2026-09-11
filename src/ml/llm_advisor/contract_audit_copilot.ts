/**
 * Roteiro de Adequação a partir do ContractQualityScorecard.
 * Usa OmniRoute/DeepSeek quando disponível; senão template determinístico.
 */

import {
  MatrixDimension,
  type ChecklistItem,
  type ContractQualityScorecard,
  type ImprovementPoint,
} from '../../core/analytics/compliance_matrix';
import type { LlmCompletionPort } from './advisor_engine';
import { TemplateLlmAdapter } from './advisor_engine';
import {
  loadOmniRouteConfigFromEnv,
  OmniRouteLlmAdapter,
  OMNIROUTE_DEFAULT_MODEL,
} from './omniroute_client';
import type {
  AdvisorTrack,
  AuditReportRequest,
  AuditReportResponse,
  AuditScorecardInput,
  CriticalGapItem,
  RenegotiationArgument,
} from './types';

const SYSTEM_PROMPT = `Você é o copiloto de auditoria contratual RAY.IA para planos de saúde (ANS).
Escreva em português do Brasil, tom executivo (diretoria), sem inventar CPF/CNPJ ou dados de pacientes.
Responda APENAS com JSON válido neste schema:
{
  "executiveSummary": "string — diagnóstico direto da saúde do contrato",
  "criticalGaps": [
    {
      "itemId": "string",
      "title": "string",
      "dimension": "string",
      "status": "PARCIAL|NAO_CONFORME",
      "monthlyCostBrl": number,
      "evidence": "string",
      "recommendedAction": "string"
    }
  ],
  "renegotiationStrategy": [
    {
      "title": "string",
      "technicalArgument": "string",
      "regulatoryBasis": "string (RN 510/507, RDC 36, TISS/TUSS)",
      "commercialTalkTrack": "string — fala pronta para mesa com prestador",
      "estimatedMonthlyImpactBrl": number
    }
  ]
}`;

function brl(n: number): string {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function monthlyFromPotential(annualOrOneShot: number): number {
  return Math.round(annualOrOneShot / 12);
}

function asDimension(raw: string): MatrixDimension {
  if (Object.values(MatrixDimension).includes(raw as MatrixDimension)) {
    return raw as MatrixDimension;
  }
  return MatrixDimension.FINANCEIRO;
}

/** Normaliza payload HTTP frouxo → ContractQualityScorecard tipado. */
export function normalizeAuditScorecard(
  input: AuditScorecardInput | ContractQualityScorecard,
): ContractQualityScorecard {
  const dims = [
    MatrixDimension.FINANCEIRO,
    MatrixDimension.REGULATORIO_ANS,
    MatrixDimension.OPERACIONAL,
    MatrixDimension.JURIDICO,
  ] as const;

  const scoreByDimension = {} as ContractQualityScorecard['scoreByDimension'];
  for (const d of dims) {
    const src =
      input.scoreByDimension[d] ??
      Object.values(input.scoreByDimension)[0] ?? {
        score: 0,
        maxScore: 100,
        status: 'Crítico',
      };
    const statusRaw = String(src.status);
    const status =
      statusRaw === 'Excelente' ||
      statusRaw === 'Adequado' ||
      statusRaw === 'Atenção' ||
      statusRaw === 'Crítico'
        ? statusRaw
        : ('Atenção' as const);
    scoreByDimension[d] = {
      score: Number(src.score) || 0,
      maxScore: Number(src.maxScore) || 100,
      status,
    };
  }

  const checklist: ChecklistItem[] = (input.checklist ?? []).map((c) => ({
    id: c.id,
    dimension: asDimension(String(c.dimension)),
    title: c.title,
    weight: 'weight' in c && typeof c.weight === 'number' ? c.weight : 0.1,
    status: c.status,
    evidence: c.evidence,
    financialImpactPotential: c.financialImpactPotential,
    recommendedAction: c.recommendedAction,
  }));

  const improvementPoints: ImprovementPoint[] = (
    input.improvementPoints ?? []
  ).map((p) => ({
    priority: p.priority,
    title: p.title,
    gap: p.gap,
    action: p.action,
    savingEstimate: p.savingEstimate,
    dimension: asDimension(String(p.dimension)),
  }));

  return {
    overallScore: Number(input.overallScore) || 0,
    scoreByDimension,
    checklist,
    totalEstimatedSavings: Number(input.totalEstimatedSavings) || 0,
    improvementPoints,
    formula:
      '0.35*FINANCEIRO + 0.25*REGULATORIO_ANS + 0.25*OPERACIONAL + 0.15*JURIDICO',
  };
}

function pickGaps(scorecard: ContractQualityScorecard): CriticalGapItem[] {
  return scorecard.checklist
    .filter((c) => c.status !== 'CONFORME')
    .sort((a, b) => b.financialImpactPotential - a.financialImpactPotential)
    .slice(0, 8)
    .map((c) => ({
      itemId: c.id,
      title: c.title,
      dimension: String(c.dimension),
      status: c.status,
      monthlyCostBrl: monthlyFromPotential(c.financialImpactPotential),
      evidence: c.evidence,
      recommendedAction: c.recommendedAction,
    }));
}

function buildStrategy(
  scorecard: ContractQualityScorecard,
  gaps: CriticalGapItem[],
): RenegotiationArgument[] {
  const fromImprovements = scorecard.improvementPoints.slice(0, 5).map((p) => ({
    title: p.title,
    technicalArgument: `${p.gap} Ação: ${p.action}`,
    regulatoryBasis:
      p.dimension === 'REGULATORIO_ANS' || p.dimension === 'JURIDICO'
        ? 'RN 510/2022 · RN 507/2022 · RDC 36/2013 (quando aplicável)'
        : 'Benchmark de rede + boas práticas TISS/TUSS',
    commercialTalkTrack: `Propor aditivo com ${p.action.toLowerCase()}, evidenciando economia estimada de ${brl(p.savingEstimate)} no ciclo.`,
    estimatedMonthlyImpactBrl: monthlyFromPotential(p.savingEstimate),
  }));

  if (fromImprovements.length >= 3) return fromImprovements;

  const fromGaps = gaps.slice(0, 3).map((g) => ({
    title: g.title,
    technicalArgument: g.evidence,
    regulatoryBasis:
      'ANS — transparência econômico-financeira e conformidade documental',
    commercialTalkTrack: g.recommendedAction,
    estimatedMonthlyImpactBrl: g.monthlyCostBrl,
  }));

  return [...fromImprovements, ...fromGaps].slice(0, 5);
}

type NormalizedAuditReq = Omit<AuditReportRequest, 'scorecard'> & {
  scorecard: ContractQualityScorecard;
};

function buildDeterministicReport(
  req: NormalizedAuditReq,
  model: string,
): AuditReportResponse {
  const track: AdvisorTrack = req.track ?? 'simulation';
  const sc = req.scorecard;
  const gaps = pickGaps(sc);
  const strategy = buildStrategy(sc, gaps);
  const dims = Object.entries(sc.scoreByDimension)
    .map(([k, v]) => `${k}: ${v.score} (${v.status})`)
    .join('; ');

  const executiveSummary = [
    `Auditoria do contrato ${req.contractId}` +
      (req.tenantLabel ? ` — ${req.tenantLabel}` : '') +
      (req.operadoraLabel ? ` × ${req.operadoraLabel}` : '') +
      '.',
    `Score global de aderência: ${sc.overallScore.toFixed(0)}% (${sc.formula}).`,
    `Pilares: ${dims}.`,
    gaps.length
      ? `Há ${gaps.length} gaps críticos com custo mensal estimado de ${brl(
          gaps.reduce((s, g) => s + g.monthlyCostBrl, 0),
        )} se não corrigidos.`
      : 'Checklist sem gaps críticos no momento.',
    `Economia potencial total mapeada: ${brl(sc.totalEstimatedSavings)}.`,
  ].join(' ');

  const fullMarkdown = [
    `# Relatório de Adequação & Roteiro de Negociação`,
    ``,
    `**Contrato:** ${req.contractId}  `,
    `**Track:** ${track} · **Modelo:** ${model}  `,
    `**Gerado em:** ${new Date().toISOString()}`,
    ``,
    `## 1. Resumo Executivo da Auditoria`,
    ``,
    executiveSummary,
    ``,
    `## 2. Matriz de Gaps Críticos`,
    ``,
    ...gaps.map(
      (g, i) =>
        `${i + 1}. **${g.title}** (${g.dimension} · ${g.status}) — ${brl(g.monthlyCostBrl)}/mês  \n` +
        `   Evidência: ${g.evidence}  \n` +
        `   Ação: ${g.recommendedAction}`,
    ),
    gaps.length === 0 ? '_Nenhum gap crítico._' : '',
    ``,
    `## 3. Estratégia de Renegociação`,
    ``,
    ...strategy.map(
      (s, i) =>
        `### ${i + 1}. ${s.title}\n` +
        `- **Argumento técnico:** ${s.technicalArgument}\n` +
        `- **Base regulatória:** ${s.regulatoryBasis}\n` +
        `- **Talk track comercial:** ${s.commercialTalkTrack}\n` +
        `- **Impacto mensal:** ${brl(s.estimatedMonthlyImpactBrl)}\n`,
    ),
    ``,
    `---`,
    `_Documento gerado por RAY.IA — segunda opinião. Revisão humana obrigatória antes de uso comercial ou jurídico._`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return {
    track,
    model,
    generatedAt: new Date().toISOString(),
    contractId: req.contractId,
    executiveSummary,
    criticalGaps: gaps,
    renegotiationStrategy: strategy,
    fullMarkdown,
    disclaimer:
      'Relatório gerado por copiloto RAY.IA (segunda opinião). Revisão jurídica/comercial humana obrigatória antes de mesa de negociação.',
    llmUsed: false,
  };
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function mergeLlmIntoReport(
  base: AuditReportResponse,
  llmText: string,
): AuditReportResponse {
  const parsed = extractJsonObject(llmText);
  if (!parsed) {
    if (llmText.length > 80) {
      return {
        ...base,
        executiveSummary: llmText.slice(0, 1200),
        fullMarkdown: base.fullMarkdown.replace(
          base.executiveSummary,
          llmText.slice(0, 2000),
        ),
        llmUsed: true,
        model: base.model,
      };
    }
    return base;
  }

  const executiveSummary =
    typeof parsed.executiveSummary === 'string' && parsed.executiveSummary
      ? parsed.executiveSummary
      : base.executiveSummary;

  let criticalGaps = base.criticalGaps;
  if (Array.isArray(parsed.criticalGaps) && parsed.criticalGaps.length) {
    criticalGaps = parsed.criticalGaps
      .map((g, i) => {
        const row = g as Record<string, unknown>;
        const fallback = base.criticalGaps[i];
        return {
          itemId: String(row.itemId ?? fallback?.itemId ?? `gap-${i}`),
          title: String(row.title ?? fallback?.title ?? 'Gap'),
          dimension: String(row.dimension ?? fallback?.dimension ?? ''),
          status: String(row.status ?? fallback?.status ?? 'PARCIAL') as
            | 'PARCIAL'
            | 'NAO_CONFORME',
          monthlyCostBrl: Number(
            row.monthlyCostBrl ?? fallback?.monthlyCostBrl ?? 0,
          ),
          evidence: String(row.evidence ?? fallback?.evidence ?? ''),
          recommendedAction: String(
            row.recommendedAction ?? fallback?.recommendedAction ?? '',
          ),
        };
      })
      .filter((g) => g.title);
  }

  let renegotiationStrategy = base.renegotiationStrategy;
  if (
    Array.isArray(parsed.renegotiationStrategy) &&
    parsed.renegotiationStrategy.length
  ) {
    renegotiationStrategy = parsed.renegotiationStrategy.map((s, i) => {
      const row = s as Record<string, unknown>;
      const fallback = base.renegotiationStrategy[i];
      return {
        title: String(row.title ?? fallback?.title ?? `Eixo ${i + 1}`),
        technicalArgument: String(
          row.technicalArgument ?? fallback?.technicalArgument ?? '',
        ),
        regulatoryBasis: String(
          row.regulatoryBasis ?? fallback?.regulatoryBasis ?? '',
        ),
        commercialTalkTrack: String(
          row.commercialTalkTrack ?? fallback?.commercialTalkTrack ?? '',
        ),
        estimatedMonthlyImpactBrl: Number(
          row.estimatedMonthlyImpactBrl ??
            fallback?.estimatedMonthlyImpactBrl ??
            0,
        ),
      };
    });
  }

  const rebuilt: AuditReportResponse = {
    ...base,
    executiveSummary,
    criticalGaps,
    renegotiationStrategy,
    llmUsed: true,
  };
  rebuilt.fullMarkdown = [
    `# Relatório de Adequação & Roteiro de Negociação`,
    ``,
    `**Contrato:** ${base.contractId}  `,
    `**Track:** ${base.track} · **Modelo:** ${base.model}  `,
    `**Gerado em:** ${rebuilt.generatedAt}`,
    ``,
    `## 1. Resumo Executivo da Auditoria`,
    ``,
    executiveSummary,
    ``,
    `## 2. Matriz de Gaps Críticos`,
    ``,
    ...criticalGaps.map(
      (g, i) =>
        `${i + 1}. **${g.title}** (${g.dimension} · ${g.status}) — ${brl(g.monthlyCostBrl)}/mês  \n` +
        `   Evidência: ${g.evidence}  \n` +
        `   Ação: ${g.recommendedAction}`,
    ),
    ``,
    `## 3. Estratégia de Renegociação`,
    ``,
    ...renegotiationStrategy.map(
      (s, i) =>
        `### ${i + 1}. ${s.title}\n` +
        `- **Argumento técnico:** ${s.technicalArgument}\n` +
        `- **Base regulatória:** ${s.regulatoryBasis}\n` +
        `- **Talk track comercial:** ${s.commercialTalkTrack}\n` +
        `- **Impacto mensal:** ${brl(s.estimatedMonthlyImpactBrl)}\n`,
    ),
    ``,
    `---`,
    `_Documento gerado por RAY.IA — segunda opinião. Revisão humana obrigatória._`,
  ].join('\n');

  return rebuilt;
}

function buildUserPrompt(req: NormalizedAuditReq): string {
  const slim = {
    contractId: req.contractId,
    tenantLabel: req.tenantLabel,
    providerSegment: req.providerSegment,
    operadoraLabel: req.operadoraLabel,
    overallScore: req.scorecard.overallScore,
    scoreByDimension: req.scorecard.scoreByDimension,
    totalEstimatedSavings: req.scorecard.totalEstimatedSavings,
    improvementPoints: req.scorecard.improvementPoints.slice(0, 8),
    nonConformeChecklist: req.scorecard.checklist
      .filter((c) => c.status !== 'CONFORME')
      .slice(0, 12)
      .map((c) => ({
        id: c.id,
        dimension: c.dimension,
        title: c.title,
        status: c.status,
        evidence: c.evidence,
        financialImpactPotential: c.financialImpactPotential,
        recommendedAction: c.recommendedAction,
      })),
  };
  return [
    'Sintetize o Roteiro de Adequação para a diretoria do plano a partir do scorecard abaixo.',
    'Seções internas: Resumo Executivo; Matriz de Gaps Críticos (custo/mês); Estratégia de Renegociação.',
    '',
    JSON.stringify(slim, null, 2),
  ].join('\n');
}

export function resolveAuditLlmPort(override?: LlmCompletionPort): {
  port: LlmCompletionPort;
  model: string;
  llmConfigured: boolean;
} {
  if (override) {
    return { port: override, model: override.name, llmConfigured: true };
  }
  const cfg = loadOmniRouteConfigFromEnv();
  if (cfg) {
    const port = new OmniRouteLlmAdapter(cfg);
    return { port, model: port.name, llmConfigured: true };
  }
  const port = new TemplateLlmAdapter();
  return {
    port,
    model: `template:${OMNIROUTE_DEFAULT_MODEL}`,
    llmConfigured: false,
  };
}

/**
 * Gera relatório de adequação + roteiro de renegociação.
 */
export async function generateAdequacyAuditReport(
  req: AuditReportRequest,
  llmOverride?: LlmCompletionPort,
): Promise<AuditReportResponse> {
  const { port, model, llmConfigured } = resolveAuditLlmPort(llmOverride);
  const normalized: NormalizedAuditReq = {
    ...req,
    scorecard: normalizeAuditScorecard(req.scorecard),
  };
  const base = buildDeterministicReport(normalized, model);

  if (!llmConfigured || port instanceof TemplateLlmAdapter) {
    return base;
  }

  try {
    const raw = await port.complete(SYSTEM_PROMPT, buildUserPrompt(normalized));
    return mergeLlmIntoReport({ ...base, model }, raw);
  } catch {
    return {
      ...base,
      model: `${model}+fallback-template`,
      llmUsed: false,
    };
  }
}

/** Alias pedido no prompt. */
export const generateContractAuditReport = generateAdequacyAuditReport;
