import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogSourceKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listDimensions() {
    return this.prisma.catalogDimension.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });
  }

  listInstruments(filters: {
    dimension?: string;
    sourceKind?: CatalogSourceKind;
  }) {
    const where: Prisma.CatalogInstrumentWhereInput = {};
    if (filters.sourceKind) {
      where.sourceKind = filters.sourceKind;
    }
    if (filters.dimension) {
      where.dimensions = {
        some: { dimension: { code: filters.dimension } },
      };
    }

    return this.prisma.catalogInstrument.findMany({
      where,
      orderBy: [{ sourceKind: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        sourceKind: true,
        sourceUrl: true,
        localPath: true,
        publisher: true,
        summary: true,
        tags: true,
        createdAt: true,
        dimensions: {
          select: {
            notes: true,
            dimension: {
              select: { code: true, name: true },
            },
          },
        },
      },
    });
  }

  async getByCode(code: string) {
    const instrument = await this.prisma.catalogInstrument.findUnique({
      where: { code },
      include: {
        dimensions: {
          include: {
            dimension: {
              select: { code: true, name: true, description: true },
            },
          },
        },
      },
    });
    if (!instrument) {
      throw new NotFoundException(`Catalog instrument "${code}" not found`);
    }
    return instrument;
  }
}
