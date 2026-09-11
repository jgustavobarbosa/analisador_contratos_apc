/**
 * Matriz de Adequação e Qualidade Contratual — 4 pilares.
 * Score Global = 0.35·Fin + 0.25·Reg + 0.25·Ope + 0.15·Jur
 */

export enum MatrixDimension {
  FINANCEIRO = 'FINANCEIRO',
  REGULATORIO_ANS = 'REGULATORIO_ANS',
  OPERACIONAL = 'OPERACIONAL',
  JURIDICO = 'JURIDICO',
}

export const MATRIX_WEIGHTS: Record<MatrixDimension, number> = {
  [MatrixDimension.FINANCEIRO]: 0.35,
  [MatrixDimension.REGULATORIO_ANS]: 0.25,
  [MatrixDimension.OPERACIONAL]: 0.25,
  [MatrixDimension.JURIDICO]: 0.15,
};

export type ChecklistStatus = 'CONFORME' | 'PARCIAL' | 'NAO_CONFORME';

export type ChecklistItem = {
  id: string;
  dimension: MatrixDimension;
  title: string;
  /** Peso relativo dentro da dimensão (soma ~1 por dimensão). */
  weight: number;
  status: ChecklistStatus;
  evidence: string;
  financialImpactPotential: number;
  recommendedAction: string;
};

export type DimensionScore = {
  score: number;
  maxScore: number;
  status: 'Excelente' | 'Adequado' | 'Atenção' | 'Crítico';
};

export type ImprovementPoint = {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  gap: string;
  action: string;
  savingEstimate: number;
  dimension: MatrixDimension;
};

export type ContractQualityScorecard = {
  overallScore: number;
  scoreByDimension: Record<MatrixDimension, DimensionScore>;
  checklist: ChecklistItem[];
  totalEstimatedSavings: number;
  improvementPoints: ImprovementPoint[];
  formula:
    '0.35*FINANCEIRO + 0.25*REGULATORIO_ANS + 0.25*OPERACIONAL + 0.15*JURIDICO';
};

/** Template canônico ≥16 pontos (status preenchido pelo avaliador). */
export type ChecklistTemplate = Omit<
  ChecklistItem,
  'status' | 'evidence' | 'financialImpactPotential' | 'recommendedAction'
> & {
  defaultImpactBrl: number;
  conformeAction: string;
  gapAction: string;
};

export const DEFAULT_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  // —— Financeiro (4+)
  {
    id: 'fin-opme-cap',
    dimension: MatrixDimension.FINANCEIRO,
    title: 'Teto contratual para OPME',
    weight: 0.28,
    defaultImpactBrl: 48000,
    conformeAction: 'Manter teto OPME e auditoria de nota fiscal.',
    gapAction: 'Incluir teto OPME indexado a SIMPRO/Brasíndice no aditivo.',
  },
  {
    id: 'fin-unbundling-sala',
    dimension: MatrixDimension.FINANCEIRO,
    title: 'Trava contra taxa de sala fracionada (unbundling)',
    weight: 0.27,
    defaultImpactBrl: 32000,
    conformeAction: 'Pacote de sala íntegro — sem cobrança avulsa de gases.',
    gapAction: 'Vedar unbundling de taxa de sala/gases no termo aditivo.',
  },
  {
    id: 'fin-ref-table',
    dimension: MatrixDimension.FINANCEIRO,
    title: 'Aderência à tabela de referência (CBHPM/SIMPRO/Brasíndice)',
    weight: 0.25,
    defaultImpactBrl: 55000,
    conformeAction: 'Preços dentro de ±10% da mediana de rede.',
    gapAction: 'Readequar diárias/taxas à mediana da rede do segmento.',
  },
  {
    id: 'fin-closed-packages',
    dimension: MatrixDimension.FINANCEIRO,
    title: 'Proporção de pacotes fechados vs. conta aberta',
    weight: 0.2,
    defaultImpactBrl: 92000,
    conformeAction: 'Majoridade dos procedimentos de alta complexidade em pacote.',
    gapAction: 'Migrar quimio/OPME de conta aberta para pacote fechado.',
  },
  // —— Regulatório (4+)
  {
    id: 'reg-rn510-reajuste',
    dimension: MatrixDimension.REGULATORIO_ANS,
    title: 'Alinhamento ao prazo/índice de reajuste RN 510/2022',
    weight: 0.28,
    defaultImpactBrl: 18000,
    conformeAction: 'Cláusula de reajuste explícita e dentro do patamar ANS.',
    gapAction: 'Reescrever cláusula de reajuste conforme RN 510/2022.',
  },
  {
    id: 'reg-certidao-cadastral',
    dimension: MatrixDimension.REGULATORIO_ANS,
    title: 'Certidão de regularidade cadastral ativa',
    weight: 0.24,
    defaultImpactBrl: 12000,
    conformeAction: 'Certidões vigentes com alerta 60/30/7.',
    gapAction: 'Renovar certidão cadastral e vincular ao dossiê vivo.',
  },
  {
    id: 'reg-rdc36',
    dimension: MatrixDimension.REGULATORIO_ANS,
    title: 'Protocolos de segurança do paciente RDC 36/2013',
    weight: 0.24,
    defaultImpactBrl: 25000,
    conformeAction: 'Evidências RDC 36 arquivadas e auditáveis.',
    gapAction: 'Atualizar protocolos RDC 36 e anexar evidências ao contrato.',
  },
  {
    id: 'reg-rn507-transparencia',
    dimension: MatrixDimension.REGULATORIO_ANS,
    title: 'Transparência econômico-financeira RN 507/2022',
    weight: 0.24,
    defaultImpactBrl: 15000,
    conformeAction: 'Anexos de preço e pacotes transparentes.',
    gapAction: 'Publicar anexos de preço e regras de pacote conforme RN 507.',
  },
  // —— Operacional (4+)
  {
    id: 'ope-glosa-recurso',
    dimension: MatrixDimension.OPERACIONAL,
    title: 'Prazo contratual de resposta a recursos de glosa',
    weight: 0.26,
    defaultImpactBrl: 28000,
    conformeAction: 'SLA de recurso ≤ 30 dias cumprido.',
    gapAction: 'Definir SLA de recurso de glosa e fila prioritária.',
  },
  {
    id: 'ope-preauth',
    dimension: MatrixDimension.OPERACIONAL,
    title: 'Fluxo padronizado TISS/TUSS com pré-autorização',
    weight: 0.28,
    defaultImpactBrl: 64000,
    conformeAction: 'Alta complexidade com senha válida vinculada ao TUSS.',
    gapAction: 'Gate de pré-autorização nos códigos de maior glosa.',
  },
  {
    id: 'ope-glosa-rate',
    dimension: MatrixDimension.OPERACIONAL,
    title: 'Taxa histórica de glosa recorrente controlada',
    weight: 0.26,
    defaultImpactBrl: 45000,
    conformeAction: 'Taxa de glosa do lote < 12%.',
    gapAction: 'Plano de redução de glosa recorrente no faturamento.',
  },
  {
    id: 'ope-auth-backlog',
    dimension: MatrixDimension.OPERACIONAL,
    title: 'Volume de pendências de autorização prévia',
    weight: 0.2,
    defaultImpactBrl: 22000,
    conformeAction: 'Backlog de autorização sob controle operacional.',
    gapAction: 'Zerar fila crítica de autorizações (>72h p95).',
  },
  // —— Jurídico (4+)
  {
    id: 'jur-rescisao',
    dimension: MatrixDimension.JURIDICO,
    title: 'Ausência de cláusulas leoninas/ambíguas em rescisão',
    weight: 0.28,
    defaultImpactBrl: 20000,
    conformeAction: 'Rescisão equilibrada e clara.',
    gapAction: 'Revisar cláusula de rescisão com parecer jurídico.',
  },
  {
    id: 'jur-lgpd',
    dimension: MatrixDimension.JURIDICO,
    title: 'Termo de consentimento / tratamento LGPD arquivado',
    weight: 0.24,
    defaultImpactBrl: 30000,
    conformeAction: 'Base legal e DPA arquivados no dossiê.',
    gapAction: 'Arquivar termo LGPD e registrar base legal no dossiê.',
  },
  {
    id: 'jur-sla-penalties',
    dimension: MatrixDimension.JURIDICO,
    title: 'Penalidades por descumprimento de SLA',
    weight: 0.24,
    defaultImpactBrl: 16000,
    conformeAction: 'SLA com penalidades proporcionais previstas.',
    gapAction: 'Incluir SLA e penalidades objetivas no aditivo.',
  },
  {
    id: 'jur-additives-reconciled',
    dimension: MatrixDimension.JURIDICO,
    title: 'Aditivos reconciliados e foro definido',
    weight: 0.24,
    defaultImpactBrl: 14000,
    conformeAction: 'Aditivos versionados e foro eleito sem conflito.',
    gapAction: 'Reconciliar aditivos pendentes e esclarecer foro.',
  },
];

function statusToPoints(status: ChecklistStatus): number {
  if (status === 'CONFORME') return 1;
  if (status === 'PARCIAL') return 0.5;
  return 0;
}

function dimensionLabel(score: number): DimensionScore['status'] {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Adequado';
  if (score >= 50) return 'Atenção';
  return 'Crítico';
}

function priorityFromImpact(
  impact: number,
  status: ChecklistStatus,
): ImprovementPoint['priority'] {
  if (status === 'NAO_CONFORME' && impact >= 40000) return 'HIGH';
  if (status === 'NAO_CONFORME' || (status === 'PARCIAL' && impact >= 30000)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export type MatrixEvaluationSignals = {
  /** 0–1 preço vs rede (>1 mais caro). */
  priceVsNetworkIndex?: number;
  /** Fração de procedimentos em pacote fechado 0–1. */
  closedPackageRatio?: number;
  hasOpmeCap?: boolean;
  unbundlingProtected?: boolean;
  rn510Aligned?: boolean;
  cadastralCertValid?: boolean;
  rdc36EvidenceOk?: boolean;
  rn507Transparent?: boolean;
  glosaRate?: number;
  preauthCoverage?: number;
  avgAppealDays?: number;
  authBacklogHigh?: boolean;
  rescissionBalanced?: boolean;
  lgpdArchived?: boolean;
  slaPenaltiesPresent?: boolean;
  additivesReconciled?: boolean;
  /** Multiplicador de impacto financeiro por porte do prestador. */
  impactScale?: number;
};

function signalStatus(
  ok: boolean | undefined,
  partialWhen?: boolean,
): ChecklistStatus {
  if (ok === true) return 'CONFORME';
  if (partialWhen) return 'PARCIAL';
  if (ok === false) return 'NAO_CONFORME';
  return 'PARCIAL';
}

/**
 * Avalia checklist a partir de sinais estruturados (warehouse ou simulação).
 */
export function evaluateChecklistFromSignals(
  signals: MatrixEvaluationSignals,
  templates: ChecklistTemplate[] = DEFAULT_CHECKLIST_TEMPLATES,
): ChecklistItem[] {
  const scale = signals.impactScale ?? 1;
  const priceIdx = signals.priceVsNetworkIndex ?? 1.1;
  const packRatio = signals.closedPackageRatio ?? 0.35;
  const glosa = signals.glosaRate ?? 0.15;
  const preauth = signals.preauthCoverage ?? 0.55;
  const appealDays = signals.avgAppealDays ?? 35;

  const byId: Record<string, () => Omit<ChecklistItem, 'id' | 'dimension' | 'title' | 'weight'>> = {
    'fin-opme-cap': () => ({
      status: signalStatus(signals.hasOpmeCap, signals.hasOpmeCap === undefined),
      evidence: signals.hasOpmeCap
        ? 'Teto OPME identificado no dossiê.'
        : 'Não há teto OPME explícito.',
      financialImpactPotential: Math.round(48000 * scale),
      recommendedAction: signals.hasOpmeCap
        ? 'Manter teto OPME e auditoria de nota fiscal.'
        : 'Incluir teto OPME indexado a SIMPRO/Brasíndice no aditivo.',
    }),
    'fin-unbundling-sala': () => ({
      status: signalStatus(
        signals.unbundlingProtected,
        signals.unbundlingProtected === undefined,
      ),
      evidence: signals.unbundlingProtected
        ? 'Cláusula anti-unbundling presente.'
        : 'Risco de cobrança fracionada de sala/gases.',
      financialImpactPotential: Math.round(32000 * scale),
      recommendedAction: signals.unbundlingProtected
        ? 'Pacote de sala íntegro — sem cobrança avulsa de gases.'
        : 'Vedar unbundling de taxa de sala/gases no termo aditivo.',
    }),
    'fin-ref-table': () => ({
      status:
        priceIdx <= 1.08
          ? 'CONFORME'
          : priceIdx <= 1.18
            ? 'PARCIAL'
            : 'NAO_CONFORME',
      evidence: `Índice preço vs rede = ${priceIdx.toFixed(2)}.`,
      financialImpactPotential: Math.round(55000 * scale * Math.max(0.5, priceIdx - 0.9)),
      recommendedAction:
        priceIdx <= 1.08
          ? 'Preços dentro de ±10% da mediana de rede.'
          : 'Readequar diárias/taxas à mediana da rede do segmento.',
    }),
    'fin-closed-packages': () => ({
      status:
        packRatio >= 0.55 ? 'CONFORME' : packRatio >= 0.35 ? 'PARCIAL' : 'NAO_CONFORME',
      evidence: `Proporção estimada de pacotes fechados: ${(packRatio * 100).toFixed(0)}%.`,
      financialImpactPotential: Math.round(92000 * scale * (1 - packRatio)),
      recommendedAction:
        packRatio >= 0.55
          ? 'Majoridade dos procedimentos de alta complexidade em pacote.'
          : 'Migrar quimio/OPME de conta aberta para pacote fechado.',
    }),
    'reg-rn510-reajuste': () => ({
      status: signalStatus(signals.rn510Aligned, !signals.rn510Aligned),
      evidence: signals.rn510Aligned
        ? 'Cláusula de reajuste alinhada à RN 510/2022.'
        : 'Reajuste sem alinhamento explícito à RN 510/2022.',
      financialImpactPotential: Math.round(18000 * scale),
      recommendedAction: signals.rn510Aligned
        ? 'Cláusula de reajuste explícita e dentro do patamar ANS.'
        : 'Reescrever cláusula de reajuste conforme RN 510/2022.',
    }),
    'reg-certidao-cadastral': () => ({
      status: signalStatus(
        signals.cadastralCertValid,
        signals.cadastralCertValid === undefined,
      ),
      evidence: signals.cadastralCertValid
        ? 'Certidão cadastral ativa.'
        : 'Certidão ausente ou a vencer.',
      financialImpactPotential: Math.round(12000 * scale),
      recommendedAction: signals.cadastralCertValid
        ? 'Certidões vigentes com alerta 60/30/7.'
        : 'Renovar certidão cadastral e vincular ao dossiê vivo.',
    }),
    'reg-rdc36': () => ({
      status: signalStatus(signals.rdc36EvidenceOk, !signals.rdc36EvidenceOk),
      evidence: signals.rdc36EvidenceOk
        ? 'Evidências RDC 36 presentes.'
        : 'Protocolos RDC 36 incompletos ou vencidos.',
      financialImpactPotential: Math.round(25000 * scale),
      recommendedAction: signals.rdc36EvidenceOk
        ? 'Evidências RDC 36 arquivadas e auditáveis.'
        : 'Atualizar protocolos RDC 36 e anexar evidências ao contrato.',
    }),
    'reg-rn507-transparencia': () => ({
      status: signalStatus(
        signals.rn507Transparent,
        signals.rn507Transparent === undefined,
      ),
      evidence: signals.rn507Transparent
        ? 'Anexos de preço transparentes (RN 507).'
        : 'Lacunas de transparência econômico-financeira.',
      financialImpactPotential: Math.round(15000 * scale),
      recommendedAction: signals.rn507Transparent
        ? 'Anexos de preço e pacotes transparentes.'
        : 'Publicar anexos de preço e regras de pacote conforme RN 507.',
    }),
    'ope-glosa-recurso': () => ({
      status:
        appealDays <= 30 ? 'CONFORME' : appealDays <= 45 ? 'PARCIAL' : 'NAO_CONFORME',
      evidence: `Prazo médio de recurso estimado: ${appealDays} dias.`,
      financialImpactPotential: Math.round(28000 * scale),
      recommendedAction:
        appealDays <= 30
          ? 'SLA de recurso ≤ 30 dias cumprido.'
          : 'Definir SLA de recurso de glosa e fila prioritária.',
    }),
    'ope-preauth': () => ({
      status:
        preauth >= 0.75 ? 'CONFORME' : preauth >= 0.5 ? 'PARCIAL' : 'NAO_CONFORME',
      evidence: `Cobertura de pré-autorização: ${(preauth * 100).toFixed(0)}%.`,
      financialImpactPotential: Math.round(64000 * scale * (1 - preauth)),
      recommendedAction:
        preauth >= 0.75
          ? 'Alta complexidade com senha válida vinculada ao TUSS.'
          : 'Gate de pré-autorização nos códigos de maior glosa.',
    }),
    'ope-glosa-rate': () => ({
      status: glosa < 0.12 ? 'CONFORME' : glosa < 0.2 ? 'PARCIAL' : 'NAO_CONFORME',
      evidence: `Taxa de glosa do lote: ${(glosa * 100).toFixed(1)}%.`,
      financialImpactPotential: Math.round(45000 * scale * Math.min(1, glosa / 0.2)),
      recommendedAction:
        glosa < 0.12
          ? 'Taxa de glosa do lote < 12%.'
          : 'Plano de redução de glosa recorrente no faturamento.',
    }),
    'ope-auth-backlog': () => ({
      status: signalStatus(!signals.authBacklogHigh, signals.authBacklogHigh),
      evidence: signals.authBacklogHigh
        ? 'Backlog de autorização elevado.'
        : 'Backlog de autorização sob controle.',
      financialImpactPotential: Math.round(22000 * scale),
      recommendedAction: signals.authBacklogHigh
        ? 'Zerar fila crítica de autorizações (>72h p95).'
        : 'Backlog de autorização sob controle operacional.',
    }),
    'jur-rescisao': () => ({
      status: signalStatus(
        signals.rescissionBalanced,
        signals.rescissionBalanced === undefined,
      ),
      evidence: signals.rescissionBalanced
        ? 'Cláusula de rescisão equilibrada.'
        : 'Rescisão ambígua ou leonina suspeita.',
      financialImpactPotential: Math.round(20000 * scale),
      recommendedAction: signals.rescissionBalanced
        ? 'Rescisão equilibrada e clara.'
        : 'Revisar cláusula de rescisão com parecer jurídico.',
    }),
    'jur-lgpd': () => ({
      status: signalStatus(signals.lgpdArchived, !signals.lgpdArchived),
      evidence: signals.lgpdArchived
        ? 'LGPD arquivada no dossiê.'
        : 'Termo LGPD ausente no dossiê.',
      financialImpactPotential: Math.round(30000 * scale),
      recommendedAction: signals.lgpdArchived
        ? 'Base legal e DPA arquivados no dossiê.'
        : 'Arquivar termo LGPD e registrar base legal no dossiê.',
    }),
    'jur-sla-penalties': () => ({
      status: signalStatus(
        signals.slaPenaltiesPresent,
        signals.slaPenaltiesPresent === undefined,
      ),
      evidence: signals.slaPenaltiesPresent
        ? 'SLA com penalidades previstas.'
        : 'SLA/penalidades ausentes ou vagos.',
      financialImpactPotential: Math.round(16000 * scale),
      recommendedAction: signals.slaPenaltiesPresent
        ? 'SLA com penalidades proporcionais previstas.'
        : 'Incluir SLA e penalidades objetivas no aditivo.',
    }),
    'jur-additives-reconciled': () => ({
      status: signalStatus(
        signals.additivesReconciled,
        signals.additivesReconciled === undefined,
      ),
      evidence: signals.additivesReconciled
        ? 'Aditivos reconciliados no dossiê vivo.'
        : 'Há aditivos pendentes de reconciliação.',
      financialImpactPotential: Math.round(14000 * scale),
      recommendedAction: signals.additivesReconciled
        ? 'Aditivos versionados e foro eleito sem conflito.'
        : 'Reconciliar aditivos pendentes e esclarecer foro.',
    }),
  };

  return templates.map((t) => {
    const evalFn = byId[t.id];
    const evaluated = evalFn
      ? evalFn()
      : {
          status: 'PARCIAL' as ChecklistStatus,
          evidence: 'Sem sinal — avaliação parcial.',
          financialImpactPotential: Math.round(t.defaultImpactBrl * scale),
          recommendedAction: t.gapAction,
        };
    return {
      id: t.id,
      dimension: t.dimension,
      title: t.title,
      weight: t.weight,
      ...evaluated,
    };
  });
}

/**
 * Consolida checklist → scorecard ponderado.
 */
export function buildContractQualityScorecard(
  checklist: ChecklistItem[],
): ContractQualityScorecard {
  const scoreByDimension = {} as Record<MatrixDimension, DimensionScore>;
  const improvementPoints: ImprovementPoint[] = [];

  for (const dim of Object.values(MatrixDimension)) {
    const items = checklist.filter((c) => c.dimension === dim);
    const weightSum = items.reduce((s, i) => s + i.weight, 0) || 1;
    const raw =
      items.reduce((s, i) => s + statusToPoints(i.status) * i.weight, 0) /
      weightSum;
    const score = Math.round(raw * 1000) / 10;
    scoreByDimension[dim] = {
      score,
      maxScore: 100,
      status: dimensionLabel(score),
    };

    for (const item of items) {
      if (item.status === 'CONFORME') continue;
      improvementPoints.push({
        priority: priorityFromImpact(
          item.financialImpactPotential,
          item.status,
        ),
        title: item.title,
        gap: item.evidence,
        action: item.recommendedAction,
        savingEstimate: item.financialImpactPotential,
        dimension: dim,
      });
    }
  }

  const overallScore =
    Math.round(
      (scoreByDimension[MatrixDimension.FINANCEIRO].score *
        MATRIX_WEIGHTS[MatrixDimension.FINANCEIRO] +
        scoreByDimension[MatrixDimension.REGULATORIO_ANS].score *
          MATRIX_WEIGHTS[MatrixDimension.REGULATORIO_ANS] +
        scoreByDimension[MatrixDimension.OPERACIONAL].score *
          MATRIX_WEIGHTS[MatrixDimension.OPERACIONAL] +
        scoreByDimension[MatrixDimension.JURIDICO].score *
          MATRIX_WEIGHTS[MatrixDimension.JURIDICO]) *
        10,
    ) / 10;

  const totalEstimatedSavings = improvementPoints.reduce(
    (s, p) => s + p.savingEstimate,
    0,
  );

  improvementPoints.sort((a, b) => {
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    if (rank[a.priority] !== rank[b.priority]) {
      return rank[a.priority] - rank[b.priority];
    }
    return b.savingEstimate - a.savingEstimate;
  });

  return {
    overallScore,
    scoreByDimension,
    checklist,
    totalEstimatedSavings,
    improvementPoints,
    formula:
      '0.35*FINANCEIRO + 0.25*REGULATORIO_ANS + 0.25*OPERACIONAL + 0.15*JURIDICO',
  };
}

export function computeQualityScorecardFromSignals(
  signals: MatrixEvaluationSignals,
): ContractQualityScorecard {
  return buildContractQualityScorecard(evaluateChecklistFromSignals(signals));
}
