/**
 * TRACK SIMULATION — deterministic full-profile generator by ProviderType.
 * Covers EPIC-1/2 (dossier), 3/4 (guides+glosa/SHAP), 5 (alerts), 8 (process ML proxy).
 */

import {
  DemoGuide,
  DemoProcessDiagnosis,
  DemoProviderProfile,
  DemoQualityScorecard,
  DemoRegulatoryAlert,
  ExtractionFieldDemo,
  ProviderType,
  ShapFeature,
  TRACK_SIMULATION,
} from './types';
import { scoreDemoProviderProfile } from './quality_scorecard';

export type GenerateProfileOptions = {
  seed?: number;
  guideCount?: number;
  operadoraFake?: string;
};

type ProviderBlueprint = {
  focus: string;
  legalName: string;
  cnpjFake: string;
  cnesFake: string;
  partyB: string;
  codes: Array<{ code: string; amount: number; label: string }>;
  glosaHotCode: string;
  processBottleneck: string;
  lossPct: number;
};

const BLUEPRINTS: Record<ProviderType, ProviderBlueprint> = {
  [ProviderType.HOSPITAL]: {
    focus: 'Internações, diárias/taxas, OPME, glosas de UTI',
    legalName: 'Hospital Demo Horizonte Ltda',
    cnpjFake: '11.111.111/0001-11',
    cnesFake: '2000001',
    partyB: 'Operadora Demo Saúde S.A.',
    codes: [
      { code: '10101012', amount: 180, label: 'Consulta eletiva' },
      { code: '90250010', amount: 1200, label: 'Diária UTI adulto' },
      { code: '70705010', amount: 8500, label: 'OPME stent (demo)' },
    ],
    glosaHotCode: '90250010',
    processBottleneck: 'autorizações prévias de OPME no bloco cirúrgico',
    lossPct: 14,
  },
  [ProviderType.CLINICA]: {
    focus: 'Consultas TUSS, pequenos procedimentos, glosas de elegibilidade',
    legalName: 'Clínica Demo Especializada ME',
    cnpjFake: '22.222.222/0001-22',
    cnesFake: '2000002',
    partyB: 'Operadora Demo Saúde S.A.',
    codes: [
      { code: '10101039', amount: 95, label: 'Consulta especializada' },
      { code: '30715010', amount: 220, label: 'Pequeno procedimento ambulatorial' },
      { code: '40301000', amount: 65, label: 'Exame complementar vinculado' },
    ],
    glosaHotCode: '40301000',
    processBottleneck: 'checagem de elegibilidade antes da emissão da guia',
    lossPct: 11,
  },
  [ProviderType.HOME_CARE]: {
    focus: 'Prazos de renovação, pacotes, medicamentos especiais',
    legalName: 'Home Care Demo Cuidar Ltda',
    cnpjFake: '33.333.333/0001-33',
    cnesFake: '2000003',
    partyB: 'Operadora Demo Saúde S.A.',
    codes: [
      { code: '50000100', amount: 480, label: 'Diária home care' },
      { code: '50000200', amount: 320, label: 'Pacote enfermagem 12h' },
      { code: '60001000', amount: 1500, label: 'Medicamento especial (demo)' },
    ],
    glosaHotCode: '60001000',
    processBottleneck: 'renovação de autorização prévia no 25º dia do ciclo',
    lossPct: 16,
  },
  [ProviderType.LABORATORIO_IMAGEM]: {
    focus: 'Exames de alta complexidade, laudos, lotes e prazos de faturamento',
    legalName: 'Lab & Imagem Demo Diagnósticos S.A.',
    cnpjFake: '44.444.444/0001-44',
    cnesFake: '2000004',
    partyB: 'Operadora Demo Saúde S.A.',
    codes: [
      { code: '40304361', amount: 42, label: 'Exame laboratorial' },
      { code: '40901100', amount: 890, label: 'RM alta complexidade (demo)' },
      { code: '40301000', amount: 55, label: 'Painel diagnóstico' },
    ],
    glosaHotCode: '40301000',
    processBottleneck: 'fechamento de lote TISS após prazo contratual de envio',
    lossPct: 9,
  },
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function field(
  path: string,
  value: string | number | boolean,
  confidence: number,
): ExtractionFieldDemo {
  return {
    path,
    value,
    confidence: clamp(confidence, 0.4, 0.99),
    status: confidence >= 0.85 ? 'accepted' : 'pending_review',
  };
}

function shapForGlosa(
  providerType: ProviderType,
  tussCode: string,
  hotCode: string,
  rnd: () => number,
): ShapFeature[] {
  const mismatch = tussCode === hotCode;
  return [
    {
      feature: `tuss_operadora_mismatch:${tussCode}`,
      shapValue: mismatch ? 0.42 + rnd() * 0.1 : 0.05 + rnd() * 0.05,
      direction: mismatch ? 'increases_glosa' : 'decreases_glosa',
    },
    {
      feature: 'doc_autorizacao_ausente',
      shapValue: mismatch ? 0.28 : 0.08,
      direction: mismatch ? 'increases_glosa' : 'decreases_glosa',
    },
    {
      feature: `provider_type:${providerType}`,
      shapValue: 0.06 + rnd() * 0.04,
      direction: 'increases_glosa',
    },
    {
      feature: 'historico_pagamento_codigo',
      shapValue: mismatch ? -0.05 : -0.18,
      direction: 'decreases_glosa',
    },
  ];
}

function buildGuides(
  bp: ProviderBlueprint,
  providerType: ProviderType,
  count: number,
  operadora: string,
  rnd: () => number,
): DemoGuide[] {
  const guides: DemoGuide[] = [];
  for (let i = 0; i < count; i++) {
    const codeMeta = bp.codes[i % bp.codes.length];
    const isHot = codeMeta.code === bp.glosaHotCode;
    // Example from prompt: ~88% when TUSS 40301000 mismatches operadora
    const glosaProbability = isHot
      ? clamp(0.82 + rnd() * 0.1, 0.8, 0.95)
      : clamp(0.08 + rnd() * 0.25, 0.05, 0.45);
    const informedSkew = isHot && rnd() > 0.4 ? 1.15 + rnd() * 0.2 : 1;
    const informedAmount = Math.round(codeMeta.amount * informedSkew * 100) / 100;
    const day = String((i % 28) + 1).padStart(2, '0');
    const alerts: string[] = [];
    if (isHot) alerts.push('divergencia_tuss_operadora');
    if (informedSkew > 1) alerts.push('valor_informado_diverge_tabela');

    guides.push({
      guideId: `SIM-G-${providerType}-${String(i + 1).padStart(3, '0')}`,
      tussCode: codeMeta.code,
      attendanceAt: `2024-08-${day}`,
      informedAmount,
      expectedAmount: codeMeta.amount,
      operadoraFake: operadora,
      glosaProbability: Math.round(glosaProbability * 1000) / 1000,
      glosaRiskLevel:
        glosaProbability >= 0.7 ? 'high' : glosaProbability >= 0.35 ? 'medium' : 'low',
      explanatoryFeatures: shapForGlosa(
        providerType,
        codeMeta.code,
        bp.glosaHotCode,
        rnd,
      ),
      alerts,
    });
  }
  return guides;
}

function buildAlerts(providerType: ProviderType): DemoRegulatoryAlert[] {
  const base: DemoRegulatoryAlert[] = [
    {
      id: `alert-${providerType}-rn510-certidao`,
      severity: 'warning',
      regulation: 'RN 510/2022',
      title: 'Certidão / documento cadastral próximo do vencimento',
      dueInDays: 15,
      message:
        'Certidão simulada vence em 15 dias — risco de desenquadramento cadastral RN 510/22.',
    },
    {
      id: `alert-${providerType}-rn510-cnes`,
      severity: 'info',
      regulation: 'RN 510/2022',
      title: 'CNES — verificação periódica',
      dueInDays: 45,
      message: 'Revalidar vínculo CNES no checklist cadastral (demo).',
    },
    {
      id: `alert-${providerType}-rdc36`,
      severity: providerType === ProviderType.HOSPITAL ? 'critical' : 'warning',
      regulation: 'RDC 36/2013',
      title: 'Protocolos de segurança do paciente',
      dueInDays: 30,
      message: 'Evidência de protocolo clínico a renovar (cenário sintético).',
    },
  ];
  if (providerType === ProviderType.HOME_CARE) {
    base.push({
      id: `alert-${providerType}-auth-renew`,
      severity: 'critical',
      regulation: 'Cláusula contratual / ANS',
      title: 'Lote de autorizações prévias a renovar',
      dueInDays: 7,
      message: 'Pacotes home care com renovação em 7 dias (demo).',
    });
  }
  return base;
}

function buildProcessDiagnosis(bp: ProviderBlueprint): DemoProcessDiagnosis {
  return {
    model: 'simulation-nn-proxy-v1',
    bottleneck: bp.processBottleneck,
    estimatedMonthlyLossPct: bp.lossPct,
    recommendation: `Priorizar correção do fluxo em "${bp.processBottleneck}" — impacto estimado ${bp.lossPct}% da perda financeira mensal (proxy NN/ML de demonstração, não modelo treinado em produção).`,
    confidence: 0.81,
  };
}

/**
 * Gera um perfil completo e determinístico para demonstração dos épicos.
 */
function attachQualityScorecard(
  profile: Omit<DemoProviderProfile, 'qualityScorecard'> & {
    qualityScorecard?: DemoQualityScorecard;
  },
): DemoProviderProfile {
  const scored = scoreDemoProviderProfile({
    ...profile,
    qualityScorecard: {
      overallScore: 0,
      scoreByDimension: {},
      totalEstimatedSavings: 0,
      improvementPoints: [],
      checklist: [],
      checklistCount: 0,
      formula: '',
    },
  });
  return {
    ...profile,
    qualityScorecard: {
      overallScore: scored.overallScore,
      scoreByDimension: scored.scoreByDimension,
      totalEstimatedSavings: scored.totalEstimatedSavings,
      improvementPoints: scored.improvementPoints.slice(0, 8),
      checklist: scored.checklist.map((c) => ({
        id: c.id,
        dimension: c.dimension,
        title: c.title,
        status: c.status,
        evidence: c.evidence,
        financialImpactPotential: c.financialImpactPotential,
        recommendedAction: c.recommendedAction,
      })),
      checklistCount: scored.checklist.length,
      formula: scored.formula,
    },
  };
}

export function generateProviderProfile(
  providerType: ProviderType,
  options: GenerateProfileOptions = {},
): DemoProviderProfile {
  const seed = options.seed ?? 42;
  const guideCount = options.guideCount ?? 20;
  const operadora = options.operadoraFake ?? 'Operadora X Demo';
  const rnd = mulberry32(seed + providerType.length * 17);
  const bp = BLUEPRINTS[providerType];

  const additives = [1, 2, 3].map((version) => {
    const code = bp.codes[Math.min(version - 1, bp.codes.length - 1)];
    return {
      version,
      title: `Aditivo sintético v${version} — ${code.label}`,
      effectiveAt: `2024-0${version + 1}-01`,
      signedAt: `2024-0${version + 1}-05`,
      summary: `Inclusão/ajuste de ${code.code} e cláusulas correlatas (TRACK SIMULATION).`,
      extractedFields: [
        field(`prices.${code.code}.amount`, code.amount, 0.91 - version * 0.03),
        field(`prices.${code.code}.effectiveAt`, `2024-0${version + 1}-01`, 0.88),
        field('clauses.reajuste.indice', 'IPCA', 0.76),
        field('clauses.reajuste.limite_ans_pct', 6.5 + version * 0.2, 0.72),
      ],
    };
  });

  const partial = {
    track: TRACK_SIMULATION as const,
    providerType,
    generatedAt: new Date(0).toISOString(),
    seed,
    party: {
      legalName: bp.legalName,
      cnpjFake: bp.cnpjFake,
      cnesFake: bp.cnesFake,
      focus: bp.focus,
    },
    dossier: {
      activeClauses: [
        {
          code: 'REAJUSTE_ANS',
          title: 'Limite de reajuste',
          text: 'Reajuste anual limitado a índice ANS/IPCA simulado (não é parecer jurídico).',
          ansReajusteLimitPct: 6.9,
        },
        {
          code: 'GLOSA_PRAZO',
          title: 'Prazo de contestação de glosa',
          text: 'Contestação em até 30 dias da notificação (cenário demo).',
          ansReajusteLimitPct: 0,
        },
        {
          code: 'FOCO_PRESTADOR',
          title: `Escopo ${providerType}`,
          text: bp.focus,
          ansReajusteLimitPct: 0,
        },
      ],
      additives,
      coverageCodes: bp.codes.map((c, i) => ({
        code: c.code,
        action: 'include' as const,
        effectiveAt: `2024-0${i + 2}-01`,
      })),
      priceTable: bp.codes.map((c, i) => ({
        code: c.code,
        amount: c.amount,
        currency: 'BRL' as const,
        effectiveAt: `2024-0${i + 2}-01`,
      })),
    },
    guides: buildGuides(bp, providerType, guideCount, operadora, rnd),
    regulatoryAlerts: buildAlerts(providerType),
    processDiagnosis: buildProcessDiagnosis(bp),
  };

  return attachQualityScorecard(partial);
}

export function listProviderTypes(): ProviderType[] {
  return Object.values(ProviderType);
}
