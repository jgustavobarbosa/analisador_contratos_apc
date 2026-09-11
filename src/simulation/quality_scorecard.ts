import {
  computeQualityScorecardFromSignals,
  type ContractQualityScorecard,
  type MatrixEvaluationSignals,
} from '../core/analytics/compliance_matrix';
import type { DemoProviderProfile, ProviderType } from './types';

const IMPACT_SCALE: Record<ProviderType, number> = {
  HOSPITAL: 1.35,
  CLINICA: 0.85,
  HOME_CARE: 1.0,
  LABORATORIO_IMAGEM: 0.75,
};

/**
 * Sinais realistas por tipo de prestador (TRACK SIMULATION).
 */
export function buildMatrixSignalsForProvider(
  providerType: ProviderType,
  profile: Pick<
    DemoProviderProfile,
    'guides' | 'regulatoryAlerts' | 'dossier' | 'processDiagnosis'
  >,
): MatrixEvaluationSignals {
  const highGlosa =
    profile.guides.filter((g) => g.glosaRiskLevel === 'high').length /
    Math.max(profile.guides.length, 1);
  const avgGlosa =
    profile.guides.reduce((s, g) => s + g.glosaProbability, 0) /
    Math.max(profile.guides.length, 1);
  const criticalAns = profile.regulatoryAlerts.some(
    (a) => a.severity === 'critical',
  );
  const warningAns = profile.regulatoryAlerts.some(
    (a) => a.severity === 'warning',
  );
  const acceptedFields = profile.dossier.additives.flatMap((a) =>
    a.extractedFields.filter((f) => f.status === 'accepted'),
  ).length;
  const totalFields = profile.dossier.additives.flatMap(
    (a) => a.extractedFields,
  ).length;
  const reconcileRatio =
    totalFields === 0 ? 0.5 : acceptedFields / totalFields;

  const base: MatrixEvaluationSignals = {
    impactScale: IMPACT_SCALE[providerType],
    glosaRate: avgGlosa,
    closedPackageRatio: 0.4,
    priceVsNetworkIndex: 1.12,
    hasOpmeCap: false,
    unbundlingProtected: false,
    rn510Aligned: profile.dossier.activeClauses.some(
      (c) => c.ansReajusteLimitPct > 0 && c.ansReajusteLimitPct <= 7,
    ),
    cadastralCertValid: !warningAns,
    rdc36EvidenceOk: !criticalAns,
    rn507Transparent: true,
    preauthCoverage: 1 - highGlosa * 1.2,
    avgAppealDays: 28 + Math.round(profile.processDiagnosis.estimatedMonthlyLossPct),
    authBacklogHigh: profile.processDiagnosis.estimatedMonthlyLossPct >= 14,
    rescissionBalanced: true,
    lgpdArchived: false,
    slaPenaltiesPresent: false,
    additivesReconciled: reconcileRatio >= 0.5,
  };

  switch (providerType) {
    case 'HOSPITAL':
      return {
        ...base,
        priceVsNetworkIndex: 1.22,
        closedPackageRatio: 0.28,
        hasOpmeCap: false,
        unbundlingProtected: false,
        preauthCoverage: Math.max(0.35, 0.7 - highGlosa),
      };
    case 'CLINICA':
      return {
        ...base,
        priceVsNetworkIndex: 1.08,
        closedPackageRatio: 0.5,
        hasOpmeCap: true,
        unbundlingProtected: true,
        preauthCoverage: Math.max(0.55, 0.85 - highGlosa),
        lgpdArchived: true,
      };
    case 'HOME_CARE':
      return {
        ...base,
        priceVsNetworkIndex: 1.15,
        closedPackageRatio: 0.62,
        hasOpmeCap: true,
        unbundlingProtected: true,
        authBacklogHigh: true,
        avgAppealDays: 40,
        slaPenaltiesPresent: false,
      };
    case 'LABORATORIO_IMAGEM':
      return {
        ...base,
        priceVsNetworkIndex: 1.05,
        closedPackageRatio: 0.7,
        hasOpmeCap: true,
        unbundlingProtected: true,
        rn507Transparent: true,
        preauthCoverage: 0.8,
        lgpdArchived: true,
        slaPenaltiesPresent: true,
      };
    default:
      return base;
  }
}

export function scoreDemoProviderProfile(
  profile: DemoProviderProfile,
): ContractQualityScorecard {
  const signals = buildMatrixSignalsForProvider(profile.providerType, profile);
  return computeQualityScorecardFromSignals(signals);
}
