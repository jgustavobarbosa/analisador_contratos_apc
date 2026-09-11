import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    tenantId?: string | null;
    actorUserId?: string | null;
    action: string;
    target?: string | null;
    ip?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.authAuditEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        target: input.target ?? null,
        ip: input.ip ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  }

  /**
   * Unified trail (auth + dossier + simulation) via AuthAuditEvent.
   * Filter by contractId matches `target` or metadata.contractId.
   */
  async listTrail(opts: {
    tenantId: string;
    contractId?: string;
    limit?: number;
  }) {
    const take = Math.min(Math.max(opts.limit ?? 100, 1), 500);
    const where: Prisma.AuthAuditEventWhereInput = {
      tenantId: opts.tenantId,
    };

    if (opts.contractId) {
      where.OR = [
        { target: opts.contractId },
        {
          metadata: {
            path: ['contractId'],
            equals: opts.contractId,
          },
        },
      ];
    }

    const rows = await this.prisma.authAuditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: { select: { id: true, email: true } },
      },
    });

    return {
      contractId: opts.contractId ?? null,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        target: r.target,
        actorUserId: r.actorUserId,
        actorEmail: r.actor?.email ?? null,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
