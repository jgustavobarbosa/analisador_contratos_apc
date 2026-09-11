import {
  calculateContractScore,
  CatalogEngine,
  CONTRACT_SCORE_WEIGHTS,
  createFraudDetectionEngine,
  rankContractsBySegment,
  SAMPLE_AUTHORIZATIONS,
  SAMPLE_CROSSWALK,
  SAMPLE_PEER_PRICES,
  sampleBilledLinesWithIssues,
  sampleContractsForSegment,
} from '../src/core/analytics';

describe('EPIC-10/11 core analytics', () => {
  describe('catalog_engine', () => {
    const engine = new CatalogEngine(SAMPLE_CROSSWALK);

    it('resolves de-para interno → TUSS / SIMPRO / ANVISA', () => {
      const stent = engine.resolveMapping('OPME-STENT-01');
      expect(stent?.tussCode).toBe('48010080');
      expect(stent?.simproCode).toBe('SIM-STENT-X');
      expect(stent?.anvisaRegistry).toBe('80123456789');
    });

    it('alerts when charged price exceeds peer median by >15%', () => {
      const alerts = engine.validateBilling(
        sampleBilledLinesWithIssues(),
        SAMPLE_PEER_PRICES,
      );
      const stent = alerts.find(
        (a) =>
          a.kind === 'price_outlier' && a.internalCode === 'OPME-STENT-01',
      );
      expect(stent).toBeDefined();
      expect(Number(stent!.evidence.ratioAbove)).toBeGreaterThan(0.15);
    });

    it('detects unbundling of gas under sala package', () => {
      const alerts = engine.detectUnbundling(sampleBilledLinesWithIssues());
      expect(alerts.some((a) => a.kind === 'unbundling')).toBe(true);
      expect(
        alerts.find((a) => a.kind === 'unbundling')?.severity,
      ).toBe('critical');
    });
  });

  describe('benchmark_engine', () => {
    it('uses official weights 30/35/15/20', () => {
      expect(CONTRACT_SCORE_WEIGHTS.historicalGlosa).toBe(0.3);
      expect(CONTRACT_SCORE_WEIGHTS.priceCompetitiveness).toBe(0.35);
      expect(CONTRACT_SCORE_WEIGHTS.regulatoryCompliance).toBe(0.15);
      expect(CONTRACT_SCORE_WEIGHTS.discrepancyResolution).toBe(0.2);
    });

    it('calculateContractScore returns 0–100 with breakdown', () => {
      const [best] = sampleContractsForSegment('HOSPITAL');
      const result = calculateContractScore(best);
      expect(result.score).toBeGreaterThan(70);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown.glosaComponent).toBeGreaterThan(0);
    });

    it('ranks segment and marks benchmark + renegotiation opportunities', () => {
      const ranking = rankContractsBySegment(
        sampleContractsForSegment('HOSPITAL'),
        { segment: 'HOSPITAL', region: 'Sudeste', track: 'simulation' },
      );
      expect(ranking.benchmarkContractId).toBe('ctr-benchmark-alpha');
      expect(ranking.ranking[0].isBenchmark).toBe(true);
      const santa = ranking.ranking.find((r) =>
        r.contractId.includes('santa-clara'),
      );
      expect(santa).toBeDefined();
      expect(santa!.renegotiationOpportunities.length).toBeGreaterThan(0);
      expect(
        santa!.renegotiationOpportunities.some((o) =>
          o.toLowerCase().includes('taxa de sala'),
        ),
      ).toBe(true);
      expect(santa!.score).toBeLessThan(ranking.ranking[0].score);
    });
  });

  describe('fraud_engine', () => {
    const fraud = createFraudDetectionEngine();
    const lines = sampleBilledLinesWithIssues();

    it('flags authorization mismatch and unknown auth', () => {
      const alerts = fraud.detectAuthorizationMismatch(
        lines,
        SAMPLE_AUTHORIZATIONS,
      );
      expect(
        alerts.some((a) => a.ruleId === 'authorization_item_mismatch'),
      ).toBe(true);
      expect(alerts.some((a) => a.ruleId === 'authorization_unknown')).toBe(
        true,
      );
    });

    it('flags porte × diárias incompatibility', () => {
      const alerts = fraud.detectPorteDiariaMismatch(lines);
      expect(alerts.some((a) => a.ruleId === 'porte_diaria_mismatch')).toBe(
        true,
      );
    });

    it('flags high-complexity burst in short window', () => {
      const alerts = fraud.detectHighComplexityBurst(lines, {
        windowDays: 7,
        maxHighComplexity: 2,
      });
      expect(alerts.some((a) => a.ruleId === 'high_complexity_burst')).toBe(
        true,
      );
    });

    it('scan returns severity-ordered combined alerts', () => {
      const alerts = fraud.scan(lines, SAMPLE_AUTHORIZATIONS);
      expect(alerts.length).toBeGreaterThan(2);
      const ranks = { critical: 3, medium: 2, low: 1 } as const;
      for (let i = 1; i < alerts.length; i++) {
        expect(ranks[alerts[i - 1].severity]).toBeGreaterThanOrEqual(
          ranks[alerts[i].severity],
        );
      }
    });
  });
});
