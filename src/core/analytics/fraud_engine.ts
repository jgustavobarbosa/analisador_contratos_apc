import type { BilledLineItem, FraudAlert, FraudSeverity } from './types';

export type AuthorizationRecord = {
  authorizationCode: string;
  allowedTussCodes: string[];
  guideId?: string;
  issuedAt: string;
};

const PORTE_MAX_DIARIAS: Record<
  NonNullable<BilledLineItem['surgicalPorte']>,
  number
> = {
  ambulatorial: 0,
  pequeno: 1,
  medio: 3,
  grande: 7,
  especial: 14,
};

function severityRank(s: FraudSeverity): number {
  return s === 'critical' ? 3 : s === 'medium' ? 2 : 1;
}

/**
 * Central de detecção de anomalias e fraude (EPIC-11).
 * Regras combinadas com severidade low | medium | critical.
 */
export class FraudDetectionEngine {
  /**
   * Frequência anômala de procedimentos de alta complexidade em janela curta.
   */
  detectHighComplexityBurst(
    lines: BilledLineItem[],
    options: { windowDays?: number; maxHighComplexity?: number } = {},
  ): FraudAlert[] {
    const windowDays = options.windowDays ?? 7;
    const maxHigh = options.maxHighComplexity ?? 3;
    const high = lines.filter((l) => l.complexity === 'alta');
    if (high.length === 0) return [];

    const byGuide = new Map<string, BilledLineItem[]>();
    for (const line of high) {
      const key = line.guideId ?? line.lineId;
      const arr = byGuide.get(key) ?? [];
      arr.push(line);
      byGuide.set(key, arr);
    }

    // Agrupa por janela temporal global
    const sorted = [...high].sort(
      (a, b) => Date.parse(a.billedAt) - Date.parse(b.billedAt),
    );
    const alerts: FraudAlert[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = Date.parse(sorted[i].billedAt);
      const windowEnd = start + windowDays * 86_400_000;
      const cluster = sorted.filter((l) => {
        const t = Date.parse(l.billedAt);
        return t >= start && t <= windowEnd;
      });
      if (cluster.length > maxHigh) {
        alerts.push({
          alertId: `burst-${sorted[i].lineId}`,
          severity: cluster.length >= maxHigh * 2 ? 'critical' : 'medium',
          ruleId: 'high_complexity_burst',
          title: 'Frequência anômala de alta complexidade',
          message: `${cluster.length} procedimentos de alta complexidade em ${windowDays} dias (limite ${maxHigh}).`,
          guideId: sorted[i].guideId,
          evidence: {
            count: cluster.length,
            windowDays,
            maxHighComplexity: maxHigh,
          },
        });
        break; // um alerta representativo por lote
      }
    }

    return alerts;
  }

  /**
   * Divergência entre autorização emitida e item faturado.
   */
  detectAuthorizationMismatch(
    lines: BilledLineItem[],
    authorizations: AuthorizationRecord[],
  ): FraudAlert[] {
    const byCode = new Map(
      authorizations.map((a) => [a.authorizationCode, a] as const),
    );
    const alerts: FraudAlert[] = [];

    for (const line of lines) {
      if (!line.authorizationCode) {
        if (line.complexity === 'alta' || line.surgicalPorte === 'grande') {
          alerts.push({
            alertId: `auth-missing-${line.lineId}`,
            severity: 'medium',
            ruleId: 'authorization_missing',
            title: 'Autorização ausente',
            message: `Item ${line.internalCode} de maior complexidade/porte sem código de autorização.`,
            guideId: line.guideId,
            evidence: { internalCode: line.internalCode },
          });
        }
        continue;
      }

      const auth = byCode.get(line.authorizationCode);
      if (!auth) {
        alerts.push({
          alertId: `auth-unknown-${line.lineId}`,
          severity: 'critical',
          ruleId: 'authorization_unknown',
          title: 'Autorização não encontrada',
          message: `Senha/autorização ${line.authorizationCode} não consta na base emitida.`,
          guideId: line.guideId,
          evidence: { authorizationCode: line.authorizationCode },
        });
        continue;
      }

      const tuss = line.tussCode;
      if (tuss && !auth.allowedTussCodes.includes(tuss)) {
        alerts.push({
          alertId: `auth-mismatch-${line.lineId}`,
          severity: 'critical',
          ruleId: 'authorization_item_mismatch',
          title: 'Divergência autorização × item faturado',
          message: `TUSS ${tuss} faturado não está entre os códigos autorizados (${auth.allowedTussCodes.join(', ')}).`,
          guideId: line.guideId,
          evidence: {
            authorizationCode: line.authorizationCode,
            tussCode: tuss,
            allowed: auth.allowedTussCodes.join('|'),
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Incompatibilidade de porte cirúrgico com diárias de internação cobradas.
   */
  detectPorteDiariaMismatch(lines: BilledLineItem[]): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    for (const line of lines) {
      if (!line.surgicalPorte || line.diariasCobradas == null) continue;
      const max = PORTE_MAX_DIARIAS[line.surgicalPorte];
      if (line.diariasCobradas > max) {
        const severity: FraudSeverity =
          line.diariasCobradas > max + 3
            ? 'critical'
            : line.diariasCobradas > max + 1
              ? 'medium'
              : 'low';
        alerts.push({
          alertId: `porte-${line.lineId}`,
          severity,
          ruleId: 'porte_diaria_mismatch',
          title: 'Porte cirúrgico incompatível com diárias',
          message: `Porte ${line.surgicalPorte} admite até ${max} diária(s); cobradas ${line.diariasCobradas}.`,
          guideId: line.guideId,
          evidence: {
            surgicalPorte: line.surgicalPorte,
            diariasCobradas: line.diariasCobradas,
            maxAllowed: max,
          },
        });
      }
    }
    return alerts;
  }

  /**
   * Executa o pacote combinado de regras e deduplica por severidade.
   */
  scan(
    lines: BilledLineItem[],
    authorizations: AuthorizationRecord[] = [],
  ): FraudAlert[] {
    const all = [
      ...this.detectHighComplexityBurst(lines),
      ...this.detectAuthorizationMismatch(lines, authorizations),
      ...this.detectPorteDiariaMismatch(lines),
    ];
    return all.sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity),
    );
  }
}

export function createFraudDetectionEngine(): FraudDetectionEngine {
  return new FraudDetectionEngine();
}
