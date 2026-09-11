import type {
  DashboardKpis,
  DemoProfile,
  EfficiencyBadge,
} from './types';

export function computeKpis(profile: DemoProfile): DashboardKpis {
  const volumeFaturado = profile.guides.reduce(
    (acc, g) => acc + g.expectedAmount,
    0,
  );
  const riscoGlosaEvitavel = profile.guides.reduce(
    (acc, g) => acc + g.informedAmount * g.glosaProbability,
    0,
  );
  const riscoGlosaPct =
    volumeFaturado <= 0
      ? 0
      : Math.round((riscoGlosaEvitavel / volumeFaturado) * 1000) / 10;

  // Tendência sintética estável por seed do perfil (demo)
  const riscoTrendPct =
    Math.round((profile.processDiagnosis.estimatedMonthlyLossPct * 0.35 - 1.2) * 10) /
    10;

  // EPIC-10 proxy: economia = % perda de processo × volume × fator de benchmark
  const potencialEconomiaContratual =
    Math.round(
      volumeFaturado *
        (profile.processDiagnosis.estimatedMonthlyLossPct / 100) *
        0.55,
    );

  const fields = profile.dossier.additives.flatMap((a) => a.extractedFields);
  const accepted = fields.filter((f) => f.status === 'accepted').length;
  const reconciliacaoPct =
    fields.length === 0 ? 0 : Math.round((accepted / fields.length) * 100);

  const highGlosa = profile.guides.filter((g) => g.glosaRiskLevel === 'high')
    .length;
  const alertasCriticosAns = profile.regulatoryAlerts.filter(
    (a) => a.severity === 'critical',
  ).length;
  const anomalias = profile.guides.filter(
    (g) => Math.abs(g.informedAmount - g.expectedAmount) / (g.expectedAmount || 1) > 0.15,
  ).length;

  // Score: reconciliação + (100 - risco%) + confiança processo
  const eficienciaScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        reconciliacaoPct * 0.45 +
          (100 - Math.min(riscoGlosaPct, 60)) * 0.35 +
          profile.processDiagnosis.confidence * 100 * 0.2,
      ),
    ),
  );

  const eficienciaBadge: EfficiencyBadge =
    eficienciaScore >= 75
      ? 'Excelente'
      : eficienciaScore >= 50
        ? 'Regular'
        : 'Crítico';

  const glosaIminenteCount = highGlosa;
  const alertasRiscoAlto =
    glosaIminenteCount + alertasCriticosAns + Math.min(anomalias, 3);

  return {
    volumeFaturado,
    riscoGlosaEvitavel,
    riscoGlosaPct,
    riscoTrendPct,
    potencialEconomiaContratual,
    eficienciaScore,
    eficienciaBadge,
    alertasRiscoAlto,
    alertasCriticosAns,
    glosaIminenteCount,
  };
}

export function brl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

/** Explicação executiva a partir do feature SHAP técnico. */
export function shapToExecutiveLabel(feature: string): string {
  const f = feature.toLowerCase();
  if (f.includes('tuss') || f.includes('operadora')) {
    return 'Código / regra da operadora desalinhados do contrato vigente';
  }
  if (f.includes('preco') || f.includes('price') || f.includes('valor')) {
    return 'Valor informado acima da tabela acordada no dossiê';
  }
  if (f.includes('auth') || f.includes('autori') || f.includes('senha')) {
    return 'Autorização prévia ausente ou fora do prazo';
  }
  if (f.includes('prazo') || f.includes('deadline') || f.includes('rn')) {
    return 'Risco de estouro de prazo regulatório ANS';
  }
  if (f.includes('cadast') || f.includes('cnes')) {
    return 'Divergência cadastral do prestador ou beneficiário';
  }
  if (f.includes('justif') || f.includes('clinic') || f.includes('laudo')) {
    return 'Justificativa clínica incompleta para o procedimento';
  }
  if (f.includes('protocol')) {
    return 'Desvio de protocolo clínico-administrativo';
  }
  return 'Fator do modelo elevando a probabilidade de glosa';
}
