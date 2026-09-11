import {
  DEFAULT_CHECKLIST_TEMPLATES,
  MATRIX_WEIGHTS,
  MatrixDimension,
  buildContractQualityScorecard,
  computeQualityScorecardFromSignals,
  evaluateChecklistFromSignals,
} from '../src/core/analytics';
import { generateProviderProfile, ProviderType } from '../src/simulation';

describe('compliance_matrix (4 pilares)', () => {
  it('defines 16+ checklist templates and official weights', () => {
    expect(DEFAULT_CHECKLIST_TEMPLATES.length).toBeGreaterThanOrEqual(16);
    expect(MATRIX_WEIGHTS[MatrixDimension.FINANCEIRO]).toBe(0.35);
    expect(MATRIX_WEIGHTS[MatrixDimension.REGULATORIO_ANS]).toBe(0.25);
    expect(MATRIX_WEIGHTS[MatrixDimension.OPERACIONAL]).toBe(0.25);
    expect(MATRIX_WEIGHTS[MatrixDimension.JURIDICO]).toBe(0.15);
  });

  it('computes weighted overall score from signals', () => {
    const card = computeQualityScorecardFromSignals({
      priceVsNetworkIndex: 1.25,
      closedPackageRatio: 0.2,
      hasOpmeCap: false,
      unbundlingProtected: false,
      rn510Aligned: false,
      cadastralCertValid: true,
      rdc36EvidenceOk: false,
      rn507Transparent: true,
      glosaRate: 0.22,
      preauthCoverage: 0.4,
      avgAppealDays: 50,
      authBacklogHigh: true,
      rescissionBalanced: true,
      lgpdArchived: false,
      slaPenaltiesPresent: false,
      additivesReconciled: false,
      impactScale: 1.2,
    });
    expect(card.overallScore).toBeGreaterThan(0);
    expect(card.overallScore).toBeLessThan(85);
    expect(card.checklist).toHaveLength(DEFAULT_CHECKLIST_TEMPLATES.length);
    expect(card.totalEstimatedSavings).toBeGreaterThan(0);
    expect(card.improvementPoints[0].priority).toMatch(/HIGH|MEDIUM|LOW/);
    expect(card.formula).toContain('0.35');
  });

  it('buildContractQualityScorecard aggregates dimensions', () => {
    const items = evaluateChecklistFromSignals({
      priceVsNetworkIndex: 1.0,
      closedPackageRatio: 0.8,
      hasOpmeCap: true,
      unbundlingProtected: true,
      rn510Aligned: true,
      cadastralCertValid: true,
      rdc36EvidenceOk: true,
      rn507Transparent: true,
      glosaRate: 0.08,
      preauthCoverage: 0.9,
      avgAppealDays: 20,
      authBacklogHigh: false,
      rescissionBalanced: true,
      lgpdArchived: true,
      slaPenaltiesPresent: true,
      additivesReconciled: true,
    });
    const card = buildContractQualityScorecard(items);
    expect(card.overallScore).toBeGreaterThanOrEqual(85);
    expect(card.scoreByDimension[MatrixDimension.FINANCEIRO].status).toMatch(
      /Excelente|Adequado/,
    );
  });

  it.each(Object.values(ProviderType))(
    'attaches realistic qualityScorecard for %s',
    (providerType) => {
      const profile = generateProviderProfile(providerType, { seed: 42 });
      expect(profile.qualityScorecard.checklistCount).toBeGreaterThanOrEqual(16);
      expect(profile.qualityScorecard.overallScore).toBeGreaterThan(0);
      expect(profile.qualityScorecard.overallScore).toBeLessThanOrEqual(100);
      expect(profile.qualityScorecard.improvementPoints.length).toBeGreaterThan(
        0,
      );
    },
  );
});
