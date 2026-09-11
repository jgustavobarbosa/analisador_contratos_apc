import { BadRequestException, Injectable } from '@nestjs/common';
import { DossierService } from '../dossier/dossier.service';
import { ComplianceService } from '../compliance/compliance.service';
import { evaluateRisk, type RiskResult } from './evaluate-risk';

@Injectable()
export class RiskService {
  constructor(
    private readonly dossier: DossierService,
    private readonly compliance: ComplianceService,
  ) {}

  async evaluateForSimulation(input: {
    tenantId: string;
    contractId: string;
    covered: boolean;
    expectedAmount: number | null;
    informedAmount: number | null;
  }): Promise<RiskResult> {
    let complianceAlerts: Array<{
      code: string;
      title?: string;
      alertLevel: 'expired' | 7;
    }> = [];
    try {
      complianceAlerts = await this.compliance.complianceAlertsForRisk(
        input.tenantId,
        input.contractId,
      );
    } catch {
      complianceAlerts = [];
    }

    return evaluateRisk({
      covered: input.covered,
      expectedAmount: input.expectedAmount,
      informedAmount: input.informedAmount,
      complianceAlerts,
    });
  }

  /**
   * Feature vector scaffold for future ML (no training).
   * Optional code+at pulls coverage/price; always includes compliance signals.
   */
  async features(
    tenantId: string,
    contractId: string,
    opts: { code?: string; at?: string },
  ) {
    await this.dossier.get(tenantId, contractId);

    let covered = false;
    let expectedAmount: number | null = null;
    const code = opts.code?.trim();
    let atIso: string | null = null;

    if (code && opts.at) {
      const at = this.parseAt(opts.at);
      atIso = at.toISOString();
      const price = await this.dossier.queryPrice(
        tenantId,
        contractId,
        code,
        at,
      );
      covered = Boolean(price.covered);
      expectedAmount =
        price.amount != null && Number.isFinite(price.amount)
          ? price.amount
          : null;
    }

    const { items } = await this.compliance.list(tenantId, contractId);
    const complianceAlerts = items
      .map((i) => ({
        code: i.code,
        alertLevel: i.alertLevel,
      }))
      .filter(
        (i): i is { code: string; alertLevel: 'expired' | 7 | 30 | 60 } =>
          i.alertLevel === 'expired' ||
          i.alertLevel === 7 ||
          i.alertLevel === 30 ||
          i.alertLevel === 60,
      );

    const risk = evaluateRisk({
      covered: code ? covered : true,
      expectedAmount,
      informedAmount: null,
      complianceAlerts,
    });

    const features: Record<string, number | boolean | string | null> = {
      ...risk.features,
      contract_id: contractId,
      procedure_code: code ?? null,
      attendance_at: atIso,
      checklist_item_count: items.length,
      checklist_missing_count: items.filter((i) => i.status === 'missing')
        .length,
      has_due_dates: items.some((i) => i.dueAt != null),
    };

    return {
      contractId,
      code: code ?? null,
      at: atIso,
      covered: code ? covered : null,
      expectedAmount,
      risk,
      features,
      keys: Object.keys(features).sort(),
    };
  }

  private parseAt(raw: string): Date {
    const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (dayOnly) return new Date(`${raw}T12:00:00.000Z`);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid "at" date');
    }
    return d;
  }
}
