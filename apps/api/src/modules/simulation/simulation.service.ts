import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../identity/audit/audit.service';
import { DossierService } from '../dossier/dossier.service';
import { RiskService } from '../risk/risk.service';
import type { RiskResult } from '../risk/evaluate-risk';
import type { CreateSimulationDto } from './simulation.dto';

export type SimulationAlert =
  | { type: 'code_not_covered'; message: string }
  | { type: 'missing_price'; message: string }
  | {
      type: 'amount_mismatch';
      message: string;
      informed: number;
      expected: number;
    };

function parseAttendanceAt(raw: string): Date {
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dayOnly) {
    return new Date(`${raw}T12:00:00.000Z`);
  }
  return new Date(raw);
}

function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

function toNum(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === 'number' ? v : Number(v);
}

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossier: DossierService,
    private readonly audit: AuditService,
    private readonly risk: RiskService,
  ) {}

  async runOne(
    tenantId: string,
    actorUserId: string,
    dto: CreateSimulationDto,
    batchId?: string,
  ) {
    const attendanceAt = parseAttendanceAt(dto.attendanceAt);
    const price = await this.dossier.queryPrice(
      tenantId,
      dto.contractId,
      dto.code.trim(),
      attendanceAt,
    );

    const alerts: SimulationAlert[] = [];
    const covered = Boolean(price.covered);
    const expectedAmount =
      price.amount != null && Number.isFinite(price.amount)
        ? price.amount
        : null;

    if (!covered) {
      alerts.push({
        type: 'code_not_covered',
        message: `Código ${dto.code} não coberto em ${attendanceAt.toISOString().slice(0, 10)}`,
      });
    }
    if (covered && expectedAmount == null) {
      alerts.push({
        type: 'missing_price',
        message: `Código ${dto.code} coberto sem preço vigente na data`,
      });
    }
    if (
      dto.informedAmount != null &&
      expectedAmount != null &&
      !amountsEqual(dto.informedAmount, expectedAmount)
    ) {
      alerts.push({
        type: 'amount_mismatch',
        message: `Valor informado (${dto.informedAmount}) difere do esperado (${expectedAmount})`,
        informed: dto.informedAmount,
        expected: expectedAmount,
      });
    }

    const riskResult = await this.risk.evaluateForSimulation({
      tenantId,
      contractId: dto.contractId,
      covered,
      expectedAmount,
      informedAmount: dto.informedAmount ?? null,
    });

    const row = await this.prisma.simulationEvidence.create({
      data: {
        tenantId,
        contractId: dto.contractId,
        code: dto.code.trim(),
        attendanceAt,
        informedAmount:
          dto.informedAmount != null
            ? new Prisma.Decimal(dto.informedAmount)
            : null,
        expectedAmount:
          expectedAmount != null ? new Prisma.Decimal(expectedAmount) : null,
        covered,
        alerts: alerts as unknown as Prisma.InputJsonValue,
        riskNotes: riskResult as unknown as Prisma.InputJsonValue,
        actorUserId,
        batchId: batchId ?? null,
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId,
      action: 'simulation_run',
      target: dto.contractId,
      metadata: {
        contractId: dto.contractId,
        simulationId: row.id,
        code: row.code,
        attendanceAt: attendanceAt.toISOString(),
        covered: row.covered,
        expectedAmount,
        informedAmount: dto.informedAmount ?? null,
        alertTypes: alerts.map((a) => a.type),
        riskLevel: riskResult.level,
        riskScore: riskResult.score,
        batchId: batchId ?? null,
      },
    });

    return this.serialize(row, riskResult);
  }

  async runBatch(
    tenantId: string,
    actorUserId: string,
    items: CreateSimulationDto[],
  ) {
    const batchId = randomUUID();
    const results = [];
    for (const item of items) {
      results.push(await this.runOne(tenantId, actorUserId, item, batchId));
    }
    return { batchId, count: results.length, results };
  }

  async list(tenantId: string, contractId: string, limit = 50) {
    await this.dossier.get(tenantId, contractId);
    const take = Math.min(Math.max(limit, 1), 200);
    const rows = await this.prisma.simulationEvidence.findMany({
      where: { tenantId, contractId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return { contractId, items: rows.map((r) => this.serialize(r)) };
  }

  private serialize(
    row: {
      id: string;
      tenantId: string;
      contractId: string;
      code: string;
      attendanceAt: Date;
      informedAmount: Prisma.Decimal | null;
      expectedAmount: Prisma.Decimal | null;
      covered: boolean;
      alerts: Prisma.JsonValue;
      riskNotes: Prisma.JsonValue | null;
      actorUserId: string;
      batchId: string | null;
      createdAt: Date;
    },
    riskOverride?: RiskResult,
  ) {
    const risk =
      riskOverride ??
      (row.riskNotes &&
      typeof row.riskNotes === 'object' &&
      !Array.isArray(row.riskNotes) &&
      'score' in (row.riskNotes as object)
        ? (row.riskNotes as unknown as RiskResult)
        : null);

    return {
      id: row.id,
      tenantId: row.tenantId,
      contractId: row.contractId,
      code: row.code,
      attendanceAt: row.attendanceAt.toISOString(),
      informedAmount: toNum(row.informedAmount),
      expectedAmount: toNum(row.expectedAmount),
      covered: row.covered,
      alerts: row.alerts,
      riskNotes: row.riskNotes,
      risk,
      actorUserId: row.actorUserId,
      batchId: row.batchId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
