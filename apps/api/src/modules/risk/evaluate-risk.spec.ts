import { evaluateRisk } from './evaluate-risk';

describe('evaluateRisk', () => {
  it('returns high when code is not covered', () => {
    const r = evaluateRisk({
      covered: false,
      expectedAmount: null,
      informedAmount: 100,
      complianceAlerts: [],
    });
    expect(r.level).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.reasons.some((x) => /não coberto/i.test(x))).toBe(true);
    expect(r.features.not_covered).toBe(true);
  });

  it('returns medium/high on amount mismatch', () => {
    const mild = evaluateRisk({
      covered: true,
      expectedAmount: 100,
      informedAmount: 105,
      complianceAlerts: [],
    });
    expect(mild.level).toBe('medium');
    expect(mild.features.amount_mismatch).toBe(true);

    const severe = evaluateRisk({
      covered: true,
      expectedAmount: 100,
      informedAmount: 150,
      complianceAlerts: [],
    });
    expect(severe.level).toBe('high');
    expect(severe.features.amount_mismatch_severe).toBe(true);
  });

  it('raises medium when compliance expired or 7-day', () => {
    const expired = evaluateRisk({
      covered: true,
      expectedAmount: 100,
      informedAmount: 100,
      complianceAlerts: [
        { code: 'cnes', alertLevel: 'expired' },
      ],
    });
    expect(expired.level).toBe('medium');
    expect(expired.features.compliance_expired_count).toBe(1);

    const day7 = evaluateRisk({
      covered: true,
      expectedAmount: 100,
      informedAmount: 100,
      complianceAlerts: [{ code: 'pgrss', alertLevel: 7 }],
    });
    expect(day7.level).toBe('medium');
    expect(day7.features.compliance_alert_7_count).toBe(1);
  });

  it('stacks reasons and stays low when clean', () => {
    const stacked = evaluateRisk({
      covered: false,
      expectedAmount: null,
      informedAmount: 200,
      complianceAlerts: [{ code: 'alvara_vigilancia', alertLevel: 'expired' }],
    });
    expect(stacked.reasons.length).toBeGreaterThanOrEqual(2);
    expect(stacked.level).toBe('high');

    const clean = evaluateRisk({
      covered: true,
      expectedAmount: 325,
      informedAmount: 325,
      complianceAlerts: [],
    });
    expect(clean.level).toBe('low');
    expect(clean.score).toBe(0);
    expect(clean.reasons).toEqual([]);
  });
});
