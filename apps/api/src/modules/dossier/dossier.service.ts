import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  CoverageAction,
  DocumentType,
  ExtractedFieldStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../identity/audit/audit.service';
import {
  CHEMO_ROOM_FEES,
  DOC_KEYS,
  EXCLUDED_CODE,
  GOLDEN_CASE_KEY,
  goldenOncoradium,
} from '../../../fixtures/contracts/unimed-oncoradium/golden';
import {
  seedCatalog,
  unimedPdfSeeds,
} from '../../../prisma/catalog-seed-data';
import { coverageAt } from './reconciliation/coverage-at';
import { priceAt, type PriceLike } from './reconciliation/price-at';
import type { CreateContractDto } from './contracts/contracts.dto';
import type { UploadDocumentDto } from './contracts/documents.dto';
import {
  autoAcceptThreshold,
  parseExtractPath,
} from './extraction/path-conventions';

function day(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}

function optionalDay(iso: string | undefined): Date | null {
  return iso ? day(iso) : null;
}

function uploadsRoot(): string {
  return (
    process.env.UPLOAD_STORAGE_ROOT ??
    join(process.cwd(), 'storage', 'uploads')
  );
}

function toNum(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : Number(v);
}

@Injectable()
export class DossierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(tenantId: string, dto: CreateContractDto) {
    return this.prisma.contract.create({
      data: {
        tenantId,
        partyA: dto.partyA,
        partyB: dto.partyB,
        title: dto.title,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.contract.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        partyA: true,
        partyB: true,
        title: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async get(tenantId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
      include: {
        documents: {
          include: { dates: true },
          orderBy: { uploadedAt: 'asc' },
        },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  private async requireContract(tenantId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  private async loadItems(contractId: string) {
    const versions = await this.prisma.dossierVersion.findMany({
      where: { contractId },
      include: { coverageItems: true, priceItems: true },
      orderBy: { version: 'asc' },
    });

    const coverage = versions.flatMap((v) =>
      v.coverageItems.map((c) => ({
        code: c.code,
        action: c.action as 'include' | 'exclude',
        effectiveAt: c.effectiveAt,
        sourceDocumentId: c.sourceDocumentId,
        dossierVersionId: v.id,
      })),
    );

    // Append-only versions: apply in order; exclude closes open price windows.
    const prices: PriceLike[] = [];
    for (const v of versions) {
      for (const p of v.priceItems) {
        prices.push({
          code: p.code,
          amount: toNum(p.amount),
          currency: p.currency,
          effectiveAt: p.effectiveAt,
          effectiveUntil: p.effectiveUntil,
          sourceDocumentId: p.sourceDocumentId,
          dossierVersionId: v.id,
        });
      }
      for (const c of v.coverageItems) {
        if (c.action !== 'exclude') continue;
        for (const p of prices) {
          if (
            p.code === c.code &&
            p.effectiveUntil == null &&
            p.effectiveAt.getTime() <= c.effectiveAt.getTime()
          ) {
            p.effectiveUntil = c.effectiveAt;
          }
        }
      }
    }

    return { versions, coverage, prices };
  }

  async getDossier(tenantId: string, contractId: string) {
    await this.requireContract(tenantId, contractId);
    const { versions, coverage, prices } = await this.loadItems(contractId);
    const latest = versions[versions.length - 1] ?? null;
    return {
      contractId,
      latestVersion: latest
        ? {
            id: latest.id,
            version: latest.version,
            effectiveFrom: latest.effectiveFrom,
            summary: latest.summary,
            snapshotHash: latest.snapshotHash,
          }
        : null,
      coverageCount: coverage.length,
      priceCount: prices.length,
    };
  }

  async getDossierAt(tenantId: string, contractId: string, at: Date) {
    await this.requireContract(tenantId, contractId);
    const { versions, coverage, prices } = await this.loadItems(contractId);
    const applied = versions.filter(
      (v) => v.effectiveFrom.getTime() <= at.getTime(),
    );
    return {
      contractId,
      at: at.toISOString(),
      appliedVersions: applied.map((v) => ({
        id: v.id,
        version: v.version,
        effectiveFrom: v.effectiveFrom,
        summary: v.summary,
      })),
      sample: {
        [EXCLUDED_CODE]: {
          ...coverageAt(coverage, EXCLUDED_CODE, at),
          price: priceAt(prices, EXCLUDED_CODE, at),
        },
      },
    };
  }

  async queryPrice(
    tenantId: string,
    contractId: string,
    code: string,
    at: Date,
  ) {
    await this.requireContract(tenantId, contractId);
    const { coverage, prices } = await this.loadItems(contractId);
    const cov = coverageAt(coverage, code, at);
    const price = priceAt(prices, code, at);
    const warnings: string[] = [];
    if (cov.covered && !price) {
      warnings.push('Coberto sem preço vigente na data');
    }
    if (!cov.covered && price) {
      warnings.push('Preço encontrado mas cobertura indica exclusão');
    }
    return {
      contractId,
      code,
      at: at.toISOString(),
      covered: cov.covered,
      amount: price?.amount,
      currency: price?.currency ?? 'BRL',
      sourceDocumentId: price?.sourceDocumentId ?? cov.item?.sourceDocumentId,
      dossierVersionId: price?.dossierVersionId ?? cov.item?.dossierVersionId,
      warnings,
    };
  }

  async listDocuments(tenantId: string, contractId: string) {
    await this.requireContract(tenantId, contractId);
    return this.prisma.contractDocument.findMany({
      where: { contractId },
      include: { dates: true },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async uploadDocument(
    tenantId: string,
    contractId: string,
    uploadedBy: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    dto: UploadDocumentDto,
  ) {
    await this.requireContract(tenantId, contractId);

    const name = file.originalname.toLowerCase();
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/x-pdf' ||
      name.endsWith('.pdf');
    if (!isPdf) {
      throw new BadRequestException('Only PDF uploads are accepted');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Empty file');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const filename = `${randomUUID()}.pdf`;
    const storageKey = `${tenantId}/${contractId}/${filename}`;
    const absDir = join(uploadsRoot(), tenantId, contractId);
    await mkdir(absDir, { recursive: true });
    await writeFile(join(absDir, filename), file.buffer);

    const title =
      dto.title?.trim() ||
      file.originalname.replace(/\.pdf$/i, '') ||
      'Documento';

    const created = await this.prisma.contractDocument.create({
      data: {
        contractId,
        type: dto.type as DocumentType,
        title,
        storageKey,
        checksum,
        uploadedBy,
        dates: {
          create: {
            eventAt: optionalDay(dto.eventAt),
            notifiedAt: optionalDay(dto.notifiedAt),
            signedAt: optionalDay(dto.signedAt),
            effectiveAt: optionalDay(dto.effectiveAt),
          },
        },
      },
      include: { dates: true },
    });

    await this.audit.record({
      tenantId,
      actorUserId: uploadedBy,
      action: 'document_uploaded',
      target: contractId,
      metadata: {
        contractId,
        documentId: created.id,
        type: created.type,
        title: created.title,
        checksum: created.checksum,
        storageKey: created.storageKey,
      },
    });

    return created;
  }

  async timeline(tenantId: string, contractId: string) {
    await this.requireContract(tenantId, contractId);
    const documents = await this.prisma.contractDocument.findMany({
      where: { contractId },
      include: {
        dates: true,
        causalFrom: true,
        causalTo: true,
      },
      orderBy: { uploadedAt: 'asc' },
    });

    const events = documents.map((doc) => {
      const sortDate =
        doc.dates?.effectiveAt ??
        doc.dates?.eventAt ??
        doc.dates?.signedAt ??
        doc.uploadedAt;
      return {
        documentId: doc.id,
        type: doc.type,
        title: doc.title,
        dates: doc.dates
          ? {
              eventAt: doc.dates.eventAt,
              notifiedAt: doc.dates.notifiedAt,
              signedAt: doc.dates.signedAt,
              effectiveAt: doc.dates.effectiveAt,
            }
          : null,
        sortAt: sortDate,
        causalLinks: [
          ...doc.causalFrom.map((l) => ({
            relation: l.relation,
            direction: 'from' as const,
            otherDocumentId: l.toDocumentId,
          })),
          ...doc.causalTo.map((l) => ({
            relation: l.relation,
            direction: 'to' as const,
            otherDocumentId: l.fromDocumentId,
          })),
        ],
      };
    });

    events.sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime());
    return { contractId, events };
  }

  /**
   * Idempotent per tenant: reuses existing golden contract if title+parties match.
   */
  async seedGoldenOncoradium(tenantId: string, uploadedBy?: string) {
    const existing = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        partyA: goldenOncoradium.partyA,
        partyB: goldenOncoradium.partyB,
        title: goldenOncoradium.title,
      },
    });
    if (existing) {
      const docs = await this.prisma.contractDocument.count({
        where: { contractId: existing.id },
      });
      if (docs > 0) {
        return {
          contractId: existing.id,
          caseKey: GOLDEN_CASE_KEY,
          reused: true,
        };
      }
    }

    const fixture = goldenOncoradium;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const contract =
          existing ??
          (await tx.contract.create({
            data: {
              tenantId,
              partyA: fixture.partyA,
              partyB: fixture.partyB,
              title: fixture.title,
            },
          }));

        const docIdByKey = new Map<string, string>();

        for (const doc of fixture.documents) {
          const created = await tx.contractDocument.create({
            data: {
              contractId: contract.id,
              type: doc.type,
              title: doc.title,
              storageKey: `fixture://${GOLDEN_CASE_KEY}/${doc.key}`,
              checksum: createHash('sha256')
                .update(doc.key)
                .digest('hex'),
              uploadedBy: uploadedBy ?? null,
              dates: {
                create: {
                  eventAt: doc.eventAt ? day(doc.eventAt) : null,
                  notifiedAt: doc.notifiedAt ? day(doc.notifiedAt) : null,
                  signedAt: doc.signedAt ? day(doc.signedAt) : null,
                  effectiveAt: doc.effectiveAt ? day(doc.effectiveAt) : null,
                },
              },
            },
          });
          docIdByKey.set(doc.key, created.id);
        }

        for (const link of fixture.causalLinks) {
          await tx.causalLink.create({
            data: {
              fromDocumentId: docIdByKey.get(link.fromDocKey)!,
              toDocumentId: docIdByKey.get(link.toDocKey)!,
              relation: link.relation,
            },
          });
        }

        for (const ver of fixture.versions) {
          const causedByDocumentId = docIdByKey.get(ver.causedByDocKey)!;
          const snapshotPayload = JSON.stringify({
            version: ver.version,
            coverage: ver.coverage,
            prices: ver.prices,
          });
          const snapshotHash = createHash('sha256')
            .update(snapshotPayload)
            .digest('hex');

          await tx.dossierVersion.create({
            data: {
              contractId: contract.id,
              version: ver.version,
              effectiveFrom: day(ver.effectiveFrom),
              causedByDocumentId,
              snapshotHash,
              summary: ver.summary,
              coverageItems: {
                create: ver.coverage.map((c) => ({
                  code: c.code,
                  action: c.action,
                  effectiveAt: day(c.effectiveAt),
                  sourceDocumentId: causedByDocumentId,
                })),
              },
              priceItems: {
                create: ver.prices.map((p) => ({
                  code: p.code,
                  amount: new Prisma.Decimal(p.amount),
                  currency: 'BRL',
                  effectiveAt: day(p.effectiveAt),
                  effectiveUntil: p.effectiveUntil
                    ? day(p.effectiveUntil)
                    : null,
                  sourceDocumentId: causedByDocumentId,
                })),
              },
            },
          });
        }

        return contract.id;
      });

      return {
        contractId: result,
        caseKey: GOLDEN_CASE_KEY,
        reused: false,
        chemoCodes: CHEMO_ROOM_FEES.map((c) => c.code),
        excludedCode: EXCLUDED_CODE,
        notifyDocKey: DOC_KEYS.notify,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Golden case already seeding');
      }
      throw err;
    }
  }

  /**
   * Import real Unimed–Oncoradium PDFs into the golden/Oncoradium contract.
   * Idempotent per (contractId, checksum). Ensures catalog seed + golden contract.
   */
  async seedUnimedPdfs(tenantId: string, uploadedBy?: string) {
    await seedCatalog(this.prisma);

    const golden = await this.seedGoldenOncoradium(tenantId, uploadedBy);
    const contractId = golden.contractId;

    const existingOncoradium = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        OR: [
          { id: contractId },
          {
            partyA: goldenOncoradium.partyA,
            partyB: goldenOncoradium.partyB,
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    const targetId = existingOncoradium?.id ?? contractId;

    const instruments = await this.prisma.catalogInstrument.findMany({
      where: { sourceKind: 'caso_base' },
      select: { id: true, code: true },
    });
    const instrumentIdByCode = new Map(
      instruments.map((i) => [i.code, i.id]),
    );

    const fixturesRoot = join(process.cwd(), 'fixtures');
    const created: Array<{
      id: string;
      code: string;
      checksum: string;
      reused: boolean;
    }> = [];
    const skipped: Array<{ code: string; reason: string }> = [];

    for (const pdf of unimedPdfSeeds()) {
      const absPath = join(
        fixturesRoot,
        'contracts',
        'unimed-oncoradium',
        'pdfs',
        pdf.fileName,
      );
      let buffer: Buffer;
      try {
        buffer = await readFile(absPath);
      } catch {
        skipped.push({ code: pdf.code, reason: `file missing: ${pdf.fileName}` });
        continue;
      }

      const checksum = createHash('sha256').update(buffer).digest('hex');
      const existingDoc = await this.prisma.contractDocument.findFirst({
        where: { contractId: targetId, checksum },
      });
      if (existingDoc) {
        const catalogInstrumentId = instrumentIdByCode.get(pdf.code) ?? null;
        if (
          catalogInstrumentId &&
          existingDoc.catalogInstrumentId !== catalogInstrumentId
        ) {
          await this.prisma.contractDocument.update({
            where: { id: existingDoc.id },
            data: { catalogInstrumentId },
          });
        }
        created.push({
          id: existingDoc.id,
          code: pdf.code,
          checksum,
          reused: true,
        });
        continue;
      }

      const filename = `${randomUUID()}.pdf`;
      const storageKey = `${tenantId}/${targetId}/${filename}`;
      const absDir = join(uploadsRoot(), tenantId, targetId);
      await mkdir(absDir, { recursive: true });
      await writeFile(join(absDir, filename), buffer);

      const catalogInstrumentId = instrumentIdByCode.get(pdf.code) ?? null;
      const doc = await this.prisma.contractDocument.create({
        data: {
          contractId: targetId,
          type: pdf.documentType,
          title: pdf.title,
          storageKey,
          checksum,
          uploadedBy: uploadedBy ?? null,
          catalogInstrumentId,
        },
      });
      created.push({
        id: doc.id,
        code: pdf.code,
        checksum,
        reused: false,
      });
    }

    const imported = created.filter((d) => !d.reused).length;
    const reused = created.filter((d) => d.reused).length;

    await this.audit.record({
      tenantId,
      actorUserId: uploadedBy ?? null,
      action: 'unimed_pdf_import',
      target: targetId,
      metadata: {
        contractId: targetId,
        imported,
        reused,
        skipped: skipped.length,
        documentIds: created.map((d) => d.id),
      },
    });

    return {
      contractId: targetId,
      caseKey: GOLDEN_CASE_KEY,
      documents: created,
      skipped,
      imported,
      reused,
    };
  }

  /**
   * Assisted extraction (no LLM/OCR): persists ExtractionBatch + ExtractedField.
   * All fields start as `pending_review` (human gate). Threshold env is used
   * only for optional bulk-accept of high-confidence rows.
   *
   * Path conventions:
   * ```json
   * [
   *   {"path":"prices.89999959.amount","value":325,"confidence":0.9},
   *   {"path":"coverage.10101012.action","value":"exclude","confidence":0.7},
   *   {"path":"prices.89999959.effectiveAt","value":"2024-08-01","confidence":0.9}
   * ]
   * ```
   */
  async extractAssisted(
    tenantId: string,
    contractId: string,
    documentId: string,
    body: unknown,
  ) {
    await this.requireContract(tenantId, contractId);
    const doc = await this.prisma.contractDocument.findFirst({
      where: { id: documentId, contractId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const fields = this.normalizeAssistedFields(body);
    if (fields.length === 0) {
      throw new BadRequestException(
        'Provide fields array or structured prices/coverage JSON',
      );
    }

    const batch = await this.prisma.extractionBatch.create({
      data: {
        documentId,
        modelVersion: 'assisted-json-v1',
        status: 'completed',
        fields: {
          create: fields.map((f) => ({
            path: f.path,
            valueJson: f.value as Prisma.InputJsonValue,
            confidence: f.confidence,
            status: ExtractedFieldStatus.pending_review,
          })),
        },
      },
      include: { fields: true },
    });

    const threshold = autoAcceptThreshold();
    return {
      batchId: batch.id,
      documentId,
      modelVersion: batch.modelVersion,
      threshold,
      fieldCount: batch.fields.length,
      fields: batch.fields.map((f) => ({
        id: f.id,
        path: f.path,
        valueJson: f.valueJson,
        confidence: f.confidence,
        status: f.status,
        belowThreshold: f.confidence < threshold,
      })),
    };
  }

  private normalizeAssistedFields(
    body: unknown,
  ): Array<{ path: string; value: unknown; confidence: number }> {
    if (Array.isArray(body)) {
      return body.map((row, i) => this.assertFieldRow(row, i));
    }
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid extraction body');
    }
    const obj = body as Record<string, unknown>;
    if (Array.isArray(obj.fields)) {
      return obj.fields.map((row, i) => this.assertFieldRow(row, i));
    }

    const out: Array<{ path: string; value: unknown; confidence: number }> =
      [];
    const prices = obj.prices;
    if (prices && typeof prices === 'object' && !Array.isArray(prices)) {
      for (const [code, meta] of Object.entries(
        prices as Record<string, Record<string, unknown>>,
      )) {
        const conf =
          typeof meta.confidence === 'number' ? meta.confidence : 0.8;
        if (meta.amount != null) {
          out.push({
            path: `prices.${code}.amount`,
            value: meta.amount,
            confidence: conf,
          });
        }
        if (meta.effectiveAt != null) {
          out.push({
            path: `prices.${code}.effectiveAt`,
            value: meta.effectiveAt,
            confidence: conf,
          });
        }
      }
    }
    const coverage = obj.coverage;
    if (coverage && typeof coverage === 'object' && !Array.isArray(coverage)) {
      for (const [code, meta] of Object.entries(
        coverage as Record<string, Record<string, unknown>>,
      )) {
        const conf =
          typeof meta.confidence === 'number' ? meta.confidence : 0.8;
        if (meta.action != null) {
          out.push({
            path: `coverage.${code}.action`,
            value: meta.action,
            confidence: conf,
          });
        }
      }
    }
    return out;
  }

  private assertFieldRow(
    row: unknown,
    index: number,
  ): { path: string; value: unknown; confidence: number } {
    if (!row || typeof row !== 'object') {
      throw new BadRequestException(`fields[${index}] must be an object`);
    }
    const r = row as Record<string, unknown>;
    if (typeof r.path !== 'string' || !r.path.trim()) {
      throw new BadRequestException(`fields[${index}].path is required`);
    }
    if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1) {
      throw new BadRequestException(
        `fields[${index}].confidence must be a number between 0 and 1`,
      );
    }
    if (!('value' in r)) {
      throw new BadRequestException(`fields[${index}].value is required`);
    }
    return {
      path: r.path.trim(),
      value: r.value,
      confidence: r.confidence,
    };
  }

  async reviewQueue(tenantId: string, contractId?: string) {
    const where: Prisma.ExtractedFieldWhereInput = {
      status: ExtractedFieldStatus.pending_review,
      batch: {
        document: {
          contract: {
            tenantId,
            ...(contractId ? { id: contractId } : {}),
          },
        },
      },
    };

    const fields = await this.prisma.extractedField.findMany({
      where,
      include: {
        batch: {
          include: {
            document: {
              select: {
                id: true,
                contractId: true,
                title: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      threshold: autoAcceptThreshold(),
      items: fields.map((f) => ({
        id: f.id,
        path: f.path,
        valueJson: f.valueJson,
        confidence: f.confidence,
        status: f.status,
        batchId: f.batchId,
        documentId: f.batch.document.id,
        contractId: f.batch.document.contractId,
        documentTitle: f.batch.document.title,
        documentType: f.batch.document.type,
        createdAt: f.createdAt,
      })),
    };
  }

  async acceptField(
    tenantId: string,
    fieldId: string,
    reviewedBy: string,
    correctedValue?: unknown,
  ) {
    const field = await this.requireFieldForTenant(tenantId, fieldId);
    if (field.status !== ExtractedFieldStatus.pending_review) {
      throw new BadRequestException(`Field is already ${field.status}`);
    }

    const valueJson =
      correctedValue !== undefined
        ? (correctedValue as Prisma.InputJsonValue)
        : (field.valueJson as Prisma.InputJsonValue);

    const updated = await this.prisma.extractedField.update({
      where: { id: fieldId },
      data: {
        status: ExtractedFieldStatus.accepted,
        valueJson,
        reviewedBy,
        reviewedAt: new Date(),
      },
      include: {
        batch: { include: { document: { include: { dates: true } } } },
      },
    });

    const applied = await this.applyAcceptedField(updated);
    const contractId = updated.batch.document.contractId;

    await this.audit.record({
      tenantId,
      actorUserId: reviewedBy,
      action: 'field_accepted',
      target: contractId,
      metadata: {
        contractId,
        fieldId: updated.id,
        path: updated.path,
        documentId: updated.batch.documentId,
        corrected: correctedValue !== undefined,
        dossierVersionId: applied?.id ?? null,
        dossierVersion: applied?.version ?? null,
      },
    });

    return {
      field: {
        id: updated.id,
        path: updated.path,
        valueJson: updated.valueJson,
        confidence: updated.confidence,
        status: updated.status,
        reviewedBy: updated.reviewedBy,
        reviewedAt: updated.reviewedAt,
      },
      dossierVersion: applied,
    };
  }

  async rejectField(tenantId: string, fieldId: string, reviewedBy: string) {
    const field = await this.requireFieldForTenant(tenantId, fieldId);
    if (field.status !== ExtractedFieldStatus.pending_review) {
      throw new BadRequestException(`Field is already ${field.status}`);
    }

    const updated = await this.prisma.extractedField.update({
      where: { id: fieldId },
      data: {
        status: ExtractedFieldStatus.rejected,
        reviewedBy,
        reviewedAt: new Date(),
      },
      include: {
        batch: { include: { document: { select: { contractId: true } } } },
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: reviewedBy,
      action: 'field_rejected',
      target: updated.batch.document.contractId,
      metadata: {
        contractId: updated.batch.document.contractId,
        fieldId: updated.id,
        path: updated.path,
      },
    });

    return {
      id: updated.id,
      path: updated.path,
      status: updated.status,
      reviewedBy: updated.reviewedBy,
      reviewedAt: updated.reviewedAt,
    };
  }

  /** Accept all pending fields for a contract with confidence ≥ threshold. */
  async acceptHighConfidence(
    tenantId: string,
    contractId: string,
    reviewedBy: string,
  ) {
    await this.requireContract(tenantId, contractId);
    const threshold = autoAcceptThreshold();
    const queue = await this.reviewQueue(tenantId, contractId);
    const eligible = queue.items.filter((i) => i.confidence >= threshold);
    const results = [];
    for (const item of eligible) {
      results.push(await this.acceptField(tenantId, item.id, reviewedBy));
    }
    return {
      threshold,
      accepted: results.length,
      results,
    };
  }

  private async requireFieldForTenant(tenantId: string, fieldId: string) {
    const field = await this.prisma.extractedField.findFirst({
      where: {
        id: fieldId,
        batch: { document: { contract: { tenantId } } },
      },
      include: {
        batch: { include: { document: { include: { dates: true } } } },
      },
    });
    if (!field) throw new NotFoundException('Extracted field not found');
    return field;
  }

  private async applyAcceptedField(field: {
    id: string;
    batchId: string;
    path: string;
    valueJson: Prisma.JsonValue;
    batch: {
      documentId: string;
      document: {
        id: string;
        contractId: string;
        dates: { effectiveAt: Date | null } | null;
      };
    };
  }): Promise<{
    id: string;
    version: number;
    snapshotHash: string | null;
    summary: string | null;
  } | null> {
    const parsed = parseExtractPath(field.path);
    if (!parsed) return null;

    const contractId = field.batch.document.contractId;
    const documentId = field.batch.documentId;
    const siblings = await this.prisma.extractedField.findMany({
      where: {
        batchId: field.batchId,
        status: ExtractedFieldStatus.accepted,
      },
    });

    const byPath = new Map(siblings.map((s) => [s.path, s.valueJson]));
    byPath.set(field.path, field.valueJson);

    if (parsed.kind === 'price') {
      const amountRaw = byPath.get(`prices.${parsed.code}.amount`);
      if (amountRaw == null) return null;
      const amount = Number(amountRaw);
      if (!Number.isFinite(amount)) {
        throw new BadRequestException('Invalid price amount');
      }
      const effRaw = byPath.get(`prices.${parsed.code}.effectiveAt`);
      const effectiveAt = this.resolveEffectiveAt(
        effRaw,
        field.batch.document.dates?.effectiveAt ?? null,
      );

      return this.appendDossierVersion(contractId, documentId, {
        summary: `Aceito prices.${parsed.code} via revisão humana`,
        coverage: [
          {
            code: parsed.code,
            action: CoverageAction.include,
            effectiveAt,
          },
        ],
        prices: [
          {
            code: parsed.code,
            amount,
            effectiveAt,
          },
        ],
      });
    }

    // coverage
    const actionRaw = byPath.get(`coverage.${parsed.code}.action`);
    if (actionRaw == null) return null;
    const actionStr = String(actionRaw);
    if (actionStr !== 'include' && actionStr !== 'exclude') {
      throw new BadRequestException('coverage action must be include|exclude');
    }
    const effectiveAt = this.resolveEffectiveAt(
      null,
      field.batch.document.dates?.effectiveAt ?? null,
    );

    return this.appendDossierVersion(contractId, documentId, {
      summary: `Aceito coverage.${parsed.code}.${actionStr} via revisão humana`,
      coverage: [
        {
          code: parsed.code,
          action: actionStr as CoverageAction,
          effectiveAt,
        },
      ],
      prices: [],
    });
  }

  private resolveEffectiveAt(
    raw: Prisma.JsonValue | null | undefined,
    fallback: Date | null,
  ): Date {
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return day(raw.slice(0, 10));
    }
    if (fallback) return fallback;
    return day(new Date().toISOString().slice(0, 10));
  }

  private async appendDossierVersion(
    contractId: string,
    causedByDocumentId: string,
    payload: {
      summary: string;
      coverage: Array<{
        code: string;
        action: CoverageAction;
        effectiveAt: Date;
      }>;
      prices: Array<{ code: string; amount: number; effectiveAt: Date }>;
    },
  ) {
    const latest = await this.prisma.dossierVersion.findFirst({
      where: { contractId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    const effectiveFrom =
      payload.prices[0]?.effectiveAt ??
      payload.coverage[0]?.effectiveAt ??
      new Date();

    const snapshotPayload = JSON.stringify({
      version: nextVersion,
      coverage: payload.coverage.map((c) => ({
        code: c.code,
        action: c.action,
        effectiveAt: c.effectiveAt.toISOString().slice(0, 10),
      })),
      prices: payload.prices.map((p) => ({
        code: p.code,
        amount: p.amount,
        effectiveAt: p.effectiveAt.toISOString().slice(0, 10),
      })),
    });
    const snapshotHash = createHash('sha256')
      .update(snapshotPayload)
      .digest('hex');

    const created = await this.prisma.dossierVersion.create({
      data: {
        contractId,
        version: nextVersion,
        effectiveFrom,
        causedByDocumentId,
        snapshotHash,
        summary: payload.summary,
        coverageItems: {
          create: payload.coverage.map((c) => ({
            code: c.code,
            action: c.action,
            effectiveAt: c.effectiveAt,
            sourceDocumentId: causedByDocumentId,
          })),
        },
        priceItems: {
          create: payload.prices.map((p) => ({
            code: p.code,
            amount: new Prisma.Decimal(p.amount),
            currency: 'BRL',
            effectiveAt: p.effectiveAt,
            sourceDocumentId: causedByDocumentId,
          })),
        },
      },
    });

    return {
      id: created.id,
      version: created.version,
      snapshotHash: created.snapshotHash,
      summary: created.summary,
    };
  }

  async exportJson(tenantId: string, contractId: string) {
    const contract = await this.get(tenantId, contractId);
    const { versions, coverage, prices } = await this.loadItems(contractId);
    const latest = versions[versions.length - 1] ?? null;

    const documents = contract.documents.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      checksum: d.checksum,
      storageKey: d.storageKey,
      uploadedBy: d.uploadedBy,
      uploadedAt: d.uploadedAt,
      dates: d.dates
        ? {
            eventAt: d.dates.eventAt,
            notifiedAt: d.dates.notifiedAt,
            signedAt: d.dates.signedAt,
            effectiveAt: d.dates.effectiveAt,
          }
        : null,
    }));

    const coverageExport = coverage.map((c) => ({
      code: c.code,
      action: c.action,
      effectiveAt: c.effectiveAt.toISOString(),
      sourceDocumentId: c.sourceDocumentId,
      dossierVersionId: c.dossierVersionId,
    }));
    const pricesExport = prices.map((p) => ({
      code: p.code,
      amount: p.amount,
      currency: p.currency,
      effectiveAt: p.effectiveAt.toISOString(),
      effectiveUntil: p.effectiveUntil?.toISOString() ?? null,
      sourceDocumentId: p.sourceDocumentId,
      dossierVersionId: p.dossierVersionId,
    }));

    const snapshotBody = {
      contractId,
      partyA: contract.partyA,
      partyB: contract.partyB,
      title: contract.title,
      latestVersion: latest
        ? {
            id: latest.id,
            version: latest.version,
            effectiveFrom: latest.effectiveFrom.toISOString(),
            summary: latest.summary,
          }
        : null,
      documents,
      coverage: coverageExport,
      prices: pricesExport,
    };

    const snapshotHash = createHash('sha256')
      .update(JSON.stringify(snapshotBody))
      .digest('hex');

    return {
      ...snapshotBody,
      snapshotHash,
      exportedAt: new Date().toISOString(),
    };
  }
}
