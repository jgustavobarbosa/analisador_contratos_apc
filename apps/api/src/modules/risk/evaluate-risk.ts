export type ComplianceAlertForRisk = {
  code: string;
  title?: string;
  alertLevel: 'expired' | 7 | 30 | 60;
};

export type EvaluateRiskInput = {
  covered: boolean;
  expectedAmount: number | null;
  informedAmount: number | null;
  complianceAlerts: ComplianceAlertForRisk[];
};

export type RiskLevel = 'low' | 'medium' | 'high';

export type RiskResult = {
  score: number;
  level: RiskLevel;
  reasons: string[];
  features: Record<string, number | boolean>;
};

function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/**
 * Deterministic glosa-risk rules (EPIC-4 v1 — no ML).
 * Stacks reasons; score 0–100; level low|medium|high.
 */
export function evaluateRisk(input: EvaluateRiskInput): RiskResult {
  const reasons: string[] = [];
  let score = 0;

  const notCovered = !input.covered;
  const hasExpected =
    input.expectedAmount != null && Number.isFinite(input.expectedAmount);
  const hasInformed =
    input.informedAmount != null && Number.isFinite(input.informedAmount);
  const amountMismatch =
    hasExpected &&
    hasInformed &&
    !amountsEqual(input.expectedAmount!, input.informedAmount!);

  let amountMismatchSevere = false;
  if (amountMismatch && input.expectedAmount! > 0) {
    const rel =
      Math.abs(input.informedAmount! - input.expectedAmount!) /
      input.expectedAmount!;
    amountMismatchSevere = rel >= 0.1;
  } else if (amountMismatch) {
    amountMismatchSevere = true;
  }

  const expiredAlerts = input.complianceAlerts.filter(
    (a) => a.alertLevel === 'expired',
  );
  const day7Alerts = input.complianceAlerts.filter((a) => a.alertLevel === 7);

  if (notCovered) {
    score += 55;
    reasons.push('Procedimento não coberto na data do atendimento');
  }

  if (amountMismatch) {
    if (amountMismatchSevere) {
      score += 35;
      reasons.push('Divergência significativa entre valor informado e esperado');
    } else {
      score += 20;
      reasons.push('Divergência de valor entre informado e esperado');
    }
  }

  if (expiredAlerts.length > 0) {
    score += 25;
    reasons.push(
      `Documentação RN510 vencida (${expiredAlerts.map((a) => a.code).join(', ')})`,
    );
  } else if (day7Alerts.length > 0) {
    score += 15;
    reasons.push(
      `Documentação RN510 vence em até 7 dias (${day7Alerts.map((a) => a.code).join(', ')})`,
    );
  }

  score = Math.max(0, Math.min(100, score));

  let level: RiskLevel = 'low';
  if (notCovered || amountMismatchSevere || score >= 50) {
    level = 'high';
  } else if (
    amountMismatch ||
    expiredAlerts.length > 0 ||
    day7Alerts.length > 0 ||
    score >= 25
  ) {
    level = 'medium';
  }

  const features: Record<string, number | boolean> = {
    covered: input.covered,
    not_covered: notCovered,
    amount_mismatch: amountMismatch,
    amount_mismatch_severe: amountMismatchSevere,
    expected_amount: input.expectedAmount ?? 0,
    informed_amount: input.informedAmount ?? 0,
    compliance_expired_count: expiredAlerts.length,
    compliance_alert_7_count: day7Alerts.length,
    compliance_alert_30_count: input.complianceAlerts.filter(
      (a) => a.alertLevel === 30,
    ).length,
    compliance_alert_60_count: input.complianceAlerts.filter(
      (a) => a.alertLevel === 60,
    ).length,
    risk_score: score,
  };

  return { score, level, reasons, features };
}
