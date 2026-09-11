import type {
  AdditiveDraft,
  AdvisorInsightCard,
  ContractDiagnosisRequest,
  ContractDiagnosisResponse,
  GenerateClauseRequest,
  OptimizationAction,
} from './types';

export const ADVISOR_MODEL = 'rayia-llm-advisor-proxy-v1';

export interface LlmCompletionPort {
  readonly name: string;
  complete(system: string, user: string): Promise<string>;
}

/** Proxy determinístico — sem PII; pronto para trocar por LLM local/cloud (EPIC-9). */
export class TemplateLlmAdapter implements LlmCompletionPort {
  readonly name = ADVISOR_MODEL;

  async complete(system: string, user: string): Promise<string> {
    return `[${this.name}]\nSYSTEM_LEN=${system.length}\nUSER_LEN=${user.length}\nOK`;
  }
}

function brl(n: number): string {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function round0(n: number): number {
  return Math.round(n);
}

/**
 * Gera parecer executivo estruturado a partir do dossiê + benchmark + glosas.
 */
export function buildContractDiagnosis(
  req: ContractDiagnosisRequest,
): ContractDiagnosisResponse {
  const track = req.track ?? 'simulation';
  const volume = req.volumeMensalEstimadoBrl ?? 1_840_000;
  const topGlosa = [...req.recurrentGlosas].sort(
    (a, b) => b.amountAtRiskBrl - a.amountAtRiskBrl,
  )[0];
  const priceGap = req.benchmark?.priceGapPct ?? 18;
  const packageSaving = round0(volume * 0.05);
  const preauthSaving = round0(
    topGlosa?.amountAtRiskBrl
      ? topGlosa.amountAtRiskBrl * 0.88
      : volume * 0.03,
  );
  const tableSaving = round0(volume * (Math.max(priceGap, 8) / 100) * 0.4);

  const strengths: string[] = [
    `Dossiê com ${req.dossier.additives.length} aditivo(s) versionado(s) — rastreabilidade EPIC-2 disponível.`,
    req.benchmark
      ? `Há contrato benchmark na rede ("${req.benchmark.benchmarkLabel}", score ${req.benchmark.benchmarkScore}) como referência de renegociação.`
      : 'Segmento com peers suficientes para normalização de preço.',
  ];

  const weaknesses: string[] = [];
  if (priceGap >= 10) {
    weaknesses.push(
      `Tabela/diária ~${priceGap.toFixed(0)}% acima da mediana da rede — erosão de margem no ciclo de faturamento.`,
    );
  }
  if (topGlosa) {
    weaknesses.push(
      `Glosa recorrente em TUSS ${topGlosa.tussCode} (${topGlosa.count} ocorrências; ${brl(topGlosa.amountAtRiskBrl)} em risco)${topGlosa.reason ? ` — ${topGlosa.reason}` : ''}.`,
    );
  }
  if (req.dossier.activeClauses.some((c) => (c.ansReajusteLimitPct ?? 0) > 6.5)) {
    weaknesses.push(
      'Cláusula de reajuste com limite acima do patamar recente de referência ANS — risco de contestação.',
    );
  }

  const outdatedAnsClauses = req.dossier.activeClauses
    .filter((c) => /reajuste|diária|taxa|material|opme|quimio/i.test(c.title + c.text))
    .slice(0, 3)
    .map((c) => ({
      code: c.code,
      title: c.title,
      issue:
        /material|opme|aberto/i.test(c.text + c.title)
          ? 'Cobrança aberta de materiais/OPME defasada frente a práticas de pacote fechado (RN 507/ANS).'
          : 'Redação desatualizada perante calendário de reajuste e transparência exigidos pela RN 510/2022.',
      regulation: /material|opme|pacote/i.test(c.text + c.title)
        ? ('RN 507/2022' as const)
        : ('RN 510/2022' as const),
    }));

  if (outdatedAnsClauses.length === 0) {
    outdatedAnsClauses.push({
      code: 'CL-REAJ',
      title: 'Reajuste e transparência',
      issue:
        'Ausência de cláusula explícita alinhada à RN 510/2022 sobre prazos e índices de reajuste.',
      regulation: 'RN 510/2022',
    });
  }

  const financialOptimizationPlan: OptimizationAction[] = [
    {
      priority: 1,
      title: 'Substituir cobrança aberta por pacote cirúrgico/quimio fechado',
      estimatedMonthlyImpactBrl: packageSaving,
      rationale:
        'Elimina unbundling de taxas/insumos e alinha ao benchmark de rede com menor taxa de glosa.',
      relatedClauseCodes: outdatedAnsClauses.map((c) => c.code).slice(0, 2),
    },
    {
      priority: 2,
      title: 'Obrigatoriedade de pré-autorização nos TUSSs de alta glosa',
      estimatedMonthlyImpactBrl: preauthSaving,
      rationale: topGlosa
        ? `Concentração de glosa em ${topGlosa.tussCode}; gate de autorização reduz retrabalho.`
        : 'Gate de autorização em procedimentos de alta complexidade.',
      relatedClauseCodes: ['AUTH-GATE'],
    },
    {
      priority: 3,
      title: 'Renegociar diárias/taxas para mediana da rede',
      estimatedMonthlyImpactBrl: tableSaving,
      rationale:
        req.benchmark?.renegotiationHints?.[0] ??
        `Fechar gap de ~${priceGap.toFixed(0)}% vs peers do segmento ${req.providerSegment}.`,
      relatedClauseCodes: ['TX-SALA', 'DIARIA'],
    },
  ].sort((a, b) => b.estimatedMonthlyImpactBrl - a.estimatedMonthlyImpactBrl)
    .map((a, i) => ({ ...a, priority: (i + 1) as 1 | 2 | 3 }));

  const judicial = req.judicialDemandSignal ?? 'moderado';
  const operationalRiskAlerts = [
    {
      severity:
        judicial === 'alto' || priceGap > 25
          ? ('critical' as const)
          : judicial === 'moderado'
            ? ('medium' as const)
            : ('low' as const),
      title: 'Alinhamento porte × demanda',
      message: `Prestador ${req.providerSegment} com sinal judicial "${judicial}" e pressão de glosa técnica — priorizar pacotes e pré-autorização antes de ampliar volume.`,
    },
    {
      severity: topGlosa && topGlosa.count >= 5 ? ('critical' as const) : ('medium' as const),
      title: 'Risco operacional de faturamento',
      message: topGlosa
        ? `Volume de glosas técnicas em ${topGlosa.tussCode} incompatível com operação estável sem aditivo corretivo.`
        : 'Monitorar lote de guias de alta complexidade nas próximas 2 semanas.',
    },
  ];

  const insights: AdvisorInsightCard[] = [
    {
      insightId: 'ins-package-chemo',
      title: `Substituir modelo aberto por pacote na Quimio/OPME`,
      estimatedImpactBrl: packageSaving,
      contractualEvidence:
        outdatedAnsClauses[0]
          ? `Cláusula ${outdatedAnsClauses[0].code} ("${outdatedAnsClauses[0].title}") — ${outdatedAnsClauses[0].issue}`
          : 'Tabela de materiais aberta no dossiê vigente.',
      actionLabel: 'Gerar Minuta de Aditivo',
      distortionType: 'open_to_package',
    },
    {
      insightId: 'ins-preauth',
      title: topGlosa
        ? `Divergência TUSS ${topGlosa.tussCode} recorrente: ausência de pré-autorização`
        : 'Institucionalizar pré-autorização em alta complexidade',
      estimatedImpactBrl: preauthSaving,
      contractualEvidence: topGlosa
        ? `${topGlosa.count} ocorrências; ${brl(topGlosa.amountAtRiskBrl)} em risco — padrão compatível com ~88% das glosas técnicas do lote.`
        : 'Guias de alta complexidade sem senha de autorização no histórico recente.',
      actionLabel: 'Gerar Notificação',
      distortionType: 'preauth_gap',
    },
    {
      insightId: 'ins-price-gap',
      title: `Diária/taxa ${priceGap.toFixed(0)}% acima da média da rede`,
      estimatedImpactBrl: tableSaving,
      contractualEvidence:
        req.benchmark?.renegotiationHints?.[0] ??
        `Score sujeito ${req.benchmark?.subjectScore ?? '—'} vs benchmark ${req.benchmark?.benchmarkScore ?? '—'} (${req.benchmark?.benchmarkLabel ?? 'rede'}).`,
      actionLabel: 'Gerar Minuta de Aditivo',
      distortionType: 'price_table',
    },
  ];

  const executiveSummary = [
    `Parecer para ${req.tenantLabel} (${req.providerSegment}` +
      (req.operadoraLabel ? ` × ${req.operadoraLabel}` : '') +
      ').',
    `Prioridade nº 1: ${financialOptimizationPlan[0].title} — impacto estimado ${brl(financialOptimizationPlan[0].estimatedMonthlyImpactBrl)}/mês.`,
    `Contrato benchmark de referência: ${req.benchmark?.benchmarkLabel ?? 'a definir'} (score ${req.benchmark?.benchmarkScore ?? 'n/d'}).`,
  ].join(' ');

  return {
    track,
    model: ADVISOR_MODEL,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    diagnosis: {
      strengths,
      weaknesses,
      outdatedAnsClauses,
    },
    financialOptimizationPlan,
    operationalRiskAlerts,
    insights,
  };
}

/**
 * Minuta de termo aditivo no padrão regulatório ANS (texto prescritivo).
 */
export function buildAdditiveDraft(req: GenerateClauseRequest): AdditiveDraft {
  const track = req.track ?? 'simulation';
  const today = new Date().toISOString().slice(0, 10);
  const title =
    req.title ??
    (req.distortionType === 'open_to_package'
      ? 'Termo Aditivo — Pacote fechado de materiais/quimioterapia'
      : req.distortionType === 'preauth_gap'
        ? 'Notificação / Aditivo — Pré-autorização obrigatória'
        : req.distortionType === 'unbundling'
          ? 'Termo Aditivo — Vedação a unbundling de taxas e gases'
          : 'Termo Aditivo — Readequação de tabela à mediana da rede');

  const clauses = draftClausesFor(req);

  const preamble = [
    `TERMO ADITIVO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SAÚDE`,
    ``,
    `Partes: Prestador ${req.tenantLabel} e Operadora ${req.operadoraLabel ?? '[OPERADORA]'}, segmento ${req.providerSegment}.`,
    `Data-base: ${today}.`,
    ``,
    `Considerando a RN 510/2022 e a RN 507/2022 da ANS, bem como a necessidade de adequação econômico-financeira e de conformidade regulatória,`,
    `as partes ajustam o contrato originário na forma das cláusulas abaixo.`,
  ].join('\n');

  const closing = [
    `As demais cláusulas do contrato originário e aditivos anteriores permanecem inalteradas no que não conflitar com o presente instrumento.`,
    `Este aditivo entra em vigor na data de sua assinatura, produzindo efeitos para guias emitidas a partir de então, sem prejuízo de vigência retroativa expressamente pactuada.`,
    ``,
    `Local e data: __________________, ${today}.`,
    ``,
    `_________________________________          _________________________________`,
    `Prestador                                            Operadora`,
  ].join('\n');

  const fullText = [
    title.toUpperCase(),
    '',
    preamble,
    '',
    ...clauses.flatMap((c) => [`${c.number}. ${c.heading}`, c.body, '']),
    closing,
  ].join('\n');

  return {
    track,
    model: ADVISOR_MODEL,
    generatedAt: new Date().toISOString(),
    documentTitle: title,
    preamble,
    clauses,
    closing,
    fullText,
    disclaimer:
      'Minuta gerada por copiloto RAY.IA (segunda opinião). Revisão jurídica humana obrigatória antes de assinatura ou envio à operadora.',
  };
}

function draftClausesFor(
  req: GenerateClauseRequest,
): AdditiveDraft['clauses'] {
  const evidence =
    req.contractualEvidence ??
    req.diagnosisContext ??
    'Distorção identificada no diagnóstico preditivo RAY.IA.';
  const impact = req.estimatedImpactBrl
    ? ` Impacto estimado da correção: ${brl(req.estimatedImpactBrl)}/mês.`
    : '';

  switch (req.distortionType) {
    case 'open_to_package':
      return [
        {
          number: '1',
          heading: 'Objeto — Pacote fechado',
          body: `Fica substituída a cobrança aberta de materiais, OPME e taxas acessórias correlatas aos procedimentos de quimioterapia/cirurgia pelo regime de PACOTE FECHADO, com valor global negociado em anexo, abrangendo insumos, gases medicinais e taxa de sala quando aplicável.${impact}`,
        },
        {
          number: '2',
          heading: 'Vedação a unbundling',
          body: `É vedada a cobrança individualizada de itens que compõem o pacote (incluindo, mas não se limitando a, oxigênio medicinal e taxas de sala), sob pena de glosa integral do item avulso. Evidência: ${evidence}`,
        },
        {
          number: '3',
          heading: 'Conformidade ANS',
          body: `As partes declaram que a presente alteração observa os princípios de transparência e adequação econômico-financeira da RN 507/2022 e demais normas ANS aplicáveis.`,
        },
      ];
    case 'preauth_gap':
      return [
        {
          number: '1',
          heading: 'Pré-autorização obrigatória',
          body: `Os procedimentos de alta complexidade e códigos TUSS com histórico de glosa recorrente somente serão faturáveis mediante autorização prévia válida emitida pela Operadora, vinculada ao código autorizado.${impact}`,
        },
        {
          number: '2',
          heading: 'Divergência autorização × item',
          body: `Item faturado fora do escopo da senha/autorização será considerado inconsistente para fins de pagamento. Evidência diagnóstica: ${evidence}`,
        },
      ];
    case 'unbundling':
      return [
        {
          number: '1',
          heading: 'Integridade da diária/taxa',
          body: `Gases medicinais e taxas acessórias integrantes da diária ou taxa de sala não poderão ser cobrados em separado quando a diária/taxa global estiver presente na mesma guia.${impact}`,
        },
      ];
    case 'ans_deadline':
      return [
        {
          number: '1',
          heading: 'Prazos regulatórios',
          body: `As partes reforçam o cumprimento dos prazos de documentação e certidões exigidos pela RN 510/2022, com alerta automático a 60/30/7 dias. Evidência: ${evidence}`,
        },
      ];
    default:
      return [
        {
          number: '1',
          heading: 'Readequação de preços',
          body: `Os valores de diárias e taxas objeto deste aditivo passam a observar teto equivalente à mediana da rede de prestadores do mesmo segmento e macrorregião, conforme benchmark anexado.${impact}`,
        },
        {
          number: '2',
          heading: 'Fundamento',
          body: `A presente readequação fundamenta-se em distorção identificada perante a tabela média da rede. Evidência: ${evidence}`,
        },
      ];
  }
}

export class LlmAdvisorService {
  constructor(private readonly llm: LlmCompletionPort = new TemplateLlmAdapter()) {}

  async diagnose(
    req: ContractDiagnosisRequest,
  ): Promise<ContractDiagnosisResponse> {
    const opinion = buildContractDiagnosis(req);
    // Gancho para LLM real: validar/reescrever executiveSummary
    await this.llm.complete(
      'Você é consultor ANS de saúde suplementar. Revise o parecer.',
      opinion.executiveSummary,
    );
    return opinion;
  }

  async generateClause(req: GenerateClauseRequest): Promise<AdditiveDraft> {
    const draft = buildAdditiveDraft(req);
    await this.llm.complete(
      'Redija minuta ANS em português jurídico-regulatório.',
      draft.fullText.slice(0, 500),
    );
    return draft;
  }

  /** Roteiro de Adequação — OmniRoute/DeepSeek via env (fallback template). */
  async generateAuditReport(
    req: import('./types').AuditReportRequest,
  ): Promise<import('./types').AuditReportResponse> {
    const { generateAdequacyAuditReport } = await import(
      './contract_audit_copilot'
    );
    return generateAdequacyAuditReport(req);
  }
}
