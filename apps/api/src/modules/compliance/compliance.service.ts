import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ComplianceItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DossierService } from '../dossier/dossier.service';
import { RN510_CHECKLIST_TEMPLATES } from './rn510-checklist';
import { computeAlertLevel, type AlertLevel } from './alert-level';
import type { PatchComplianceItemDto } from './compliance.dto';

export type ComplianceItemView = {
  id: string;
  tenantId: string;
  contractId: string | null;
  code: string;
  title: string;
  requiredBy: string;
  dueAt: string | null;
  status: ComplianceItemStatus;
  evidenceDocId: string | null;
  updatedAt: string;
  alertLevel: AlertLevel;
};

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossier: DossierService,
  ) {}

  async ensure(tenantId: string, contractId: string) {
    await this.dossier.get(tenantId, contractId);

    const existing = await this.prisma.complianceChecklistItem.findMany({
      where: { tenantId, contractId },
    });
    const existingCodes = new Set(existing.map((i) => i.code));

    const toCreate = RN510_CHECKLIST_TEMPLATES.filter(
      (t) => !existingCodes.has(t.code),
    );

    if (toCreate.length > 0) {
      const now = new Date();
      await this.prisma.complianceChecklistItem.createMany({
        data: toCreate.map((t) => ({
          tenantId,
          contractId,
          code: t.code,
          title: t.title,
          requiredBy: t.requiredBy,
          status: ComplianceItemStatus.missing,
          updatedAt: now,
        })),
      });
    }

    const items = await this.list(tenantId, contractId);
    return {
      contractId,
      created: toCreate.length,
      total: items.items.length,
      items: items.items,
    };
  }

  async list(tenantId: string, contractId: string) {
    await this.dossier.get(tenantId, contractId);
    const rows = await this.prisma.complianceChecklistItem.findMany({
      where: { tenantId, contractId },
      orderBy: { code: 'asc' },
    });
    return {
      contractId,
      items: rows.map((r) => this.serialize(r)),
    };
  }

  async patch(tenantId: string, id: string, dto: PatchComplianceItemDto) {
    const row = await this.prisma.complianceChecklistItem.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Compliance item not found');

    const data: Prisma.ComplianceChecklistItemUpdateInput = {};

    if (dto.dueAt !== undefined) {
      if (dto.dueAt === null) {
        data.dueAt = null;
      } else {
        data.dueAt = this.parseDueAt(dto.dueAt);
      }
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.evidenceDocId !== undefined) {
      data.evidenceDocId = dto.evidenceDocId;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.prisma.complianceChecklistItem.update({
      where: { id },
      data,
    });
    return this.serialize(updated);
  }

  /** Alert levels useful for risk engine (expired / 7-day). */
  async complianceAlertsForRisk(tenantId: string, contractId: string) {
    const { items } = await this.list(tenantId, contractId);
    return items
      .filter((i) => i.alertLevel === 'expired' || i.alertLevel === 7)
      .map((i) => ({
        code: i.code,
        title: i.title,
        alertLevel: i.alertLevel as 'expired' | 7,
        status: i.status,
      }));
  }

  private parseDueAt(raw: string): Date {
    const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (dayOnly) {
      return new Date(`${raw}T12:00:00.000Z`);
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid dueAt');
    }
    return d;
  }

  private serialize(row: {
    id: string;
    tenantId: string;
    contractId: string | null;
    code: string;
    title: string;
    requiredBy: string;
    dueAt: Date | null;
    status: ComplianceItemStatus;
    evidenceDocId: string | null;
    updatedAt: Date;
  }): ComplianceItemView {
    return {
      id: row.id,
      tenantId: row.tenantId,
      contractId: row.contractId,
      code: row.code,
      title: row.title,
      requiredBy: row.requiredBy,
      dueAt: row.dueAt ? row.dueAt.toISOString() : null,
      status: row.status,
      evidenceDocId: row.evidenceDocId,
      updatedAt: row.updatedAt.toISOString(),
      alertLevel: computeAlertLevel(row.dueAt),
    };
  }
}
