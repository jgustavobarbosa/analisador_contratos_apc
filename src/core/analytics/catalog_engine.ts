import type {
  BilledLineItem,
  CatalogCrosswalkItem,
  CatalogValidationAlert,
  FraudSeverity,
  PeerPriceObservation,
} from './types';

const PRICE_OUTLIER_THRESHOLD = 0.15; // >15% acima da mediana

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function severityForOverprice(ratioAbove: number): FraudSeverity {
  if (ratioAbove >= 0.4) return 'critical';
  if (ratioAbove >= 0.25) return 'medium';
  return 'low';
}

/**
 * Catálogo unificado — de-para + validadores de cobrança (EPIC-11).
 */
export class CatalogEngine {
  constructor(private readonly crosswalk: CatalogCrosswalkItem[]) {}

  findByInternal(code: string): CatalogCrosswalkItem | undefined {
    return this.crosswalk.find((c) => c.internalCode === code);
  }

  findByTuss(tussCode: string): CatalogCrosswalkItem | undefined {
    return this.crosswalk.find((c) => c.tussCode === tussCode);
  }

  /**
   * Resolve de-para: código interno ↔ TUSS/TISS ↔ Brasíndice/SIMPRO ↔ ANVISA.
   */
  resolveMapping(internalCode: string): CatalogCrosswalkItem | null {
    return this.findByInternal(internalCode) ?? null;
  }

  /**
   * Valida linhas faturadas contra mediana de pares e regras de unbundling.
   */
  validateBilling(
    lines: BilledLineItem[],
    peerPrices: PeerPriceObservation[],
  ): CatalogValidationAlert[] {
    const alerts: CatalogValidationAlert[] = [];

    for (const line of lines) {
      const mapping = this.resolveMapping(line.internalCode);
      if (!mapping) {
        alerts.push({
          alertId: `cw-missing-${line.lineId}`,
          severity: 'medium',
          kind: 'missing_crosswalk',
          message: `Item ${line.internalCode} sem de-para TUSS/Brasíndice/SIMPRO/ANVISA no catálogo unificado.`,
          lineId: line.lineId,
          internalCode: line.internalCode,
          evidence: { internalCode: line.internalCode },
        });
        continue;
      }

      const peers = peerPrices.filter(
        (p) =>
          p.internalCode === line.internalCode ||
          (line.tussCode != null && p.tussCode === line.tussCode),
      );
      const med = median(peers.map((p) => p.amountBrl));
      if (med != null && med > 0) {
        const unitPrice = line.chargedAmountBrl / Math.max(line.quantity, 1);
        const ratioAbove = (unitPrice - med) / med;
        if (ratioAbove > PRICE_OUTLIER_THRESHOLD) {
          alerts.push({
            alertId: `price-${line.lineId}`,
            severity: severityForOverprice(ratioAbove),
            kind: 'price_outlier',
            message: `Valor de ${line.internalCode} excede em ${(ratioAbove * 100).toFixed(1)}% a mediana contratada de pares similares (limite 15%).`,
            lineId: line.lineId,
            internalCode: line.internalCode,
            evidence: {
              unitPrice,
              peerMedian: med,
              ratioAbove: Math.round(ratioAbove * 1000) / 1000,
              threshold: PRICE_OUTLIER_THRESHOLD,
            },
          });
        }
      }
    }

    alerts.push(...this.detectUnbundling(lines));
    return alerts;
  }

  /**
   * Unbundling: cobrança individual de itens que compõem taxa de sala / diária global.
   */
  detectUnbundling(lines: BilledLineItem[]): CatalogValidationAlert[] {
    const alerts: CatalogValidationAlert[] = [];
    const codesOnGuide = new Map<string, Set<string>>();

    for (const line of lines) {
      const guideKey = line.guideId ?? '_noguide';
      if (!codesOnGuide.has(guideKey)) codesOnGuide.set(guideKey, new Set());
      codesOnGuide.get(guideKey)!.add(line.internalCode);
    }

    for (const line of lines) {
      const mapping = this.resolveMapping(line.internalCode);
      if (!mapping?.packageParentCode) continue;
      const guideKey = line.guideId ?? '_noguide';
      const siblings = codesOnGuide.get(guideKey);
      if (siblings?.has(mapping.packageParentCode)) {
        alerts.push({
          alertId: `unbundle-${line.lineId}`,
          severity: 'critical',
          kind: 'unbundling',
          message: `Possível unbundling: ${line.internalCode} cobrado à parte enquanto o pacote ${mapping.packageParentCode} (taxa de sala/diária) já está na mesma guia.`,
          lineId: line.lineId,
          internalCode: line.internalCode,
          evidence: {
            packageParentCode: mapping.packageParentCode,
            guideId: line.guideId ?? null,
          },
        });
      }
    }

    return alerts;
  }
}

export function createCatalogEngine(
  crosswalk: CatalogCrosswalkItem[],
): CatalogEngine {
  return new CatalogEngine(crosswalk);
}
