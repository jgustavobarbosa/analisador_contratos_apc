import { createHash } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cookieFrom,
  createTestApp,
  seedTenant,
} from './test-utils';

describe('Assisted extraction + review queue', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tenantA = '66666666-6666-4666-8666-666666666666';
  const tenantB = '77777777-7777-4777-8777-777777777777';
  const password = 'SecurePass1!';
  const emailA = 'extract-admin-a@example.com';
  const emailB = 'extract-admin-b@example.com';
  let cookieA = '';
  let cookieB = '';
  let contractA = '';
  let docA = '';

  const pdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
    'utf8',
  );
  const priceCode = '89999959';

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;

    await seedTenant(prisma, {
      tenantId: tenantA,
      adminEmail: emailA,
      adminPassword: password,
    });
    await seedTenant(prisma, {
      tenantId: tenantB,
      adminEmail: emailB,
      adminPassword: password,
    });

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailA, password })
      .expect(200);
    cookieA = cookieFrom(loginA);

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailB, password })
      .expect(200);
    cookieB = cookieFrom(loginB);

    const created = await request(app.getHttpServer())
      .post('/contracts')
      .set('Cookie', cookieA)
      .send({
        partyA: 'Operadora Extract',
        partyB: 'Prestador Extract',
        title: 'Contrato extract/review',
      })
      .expect(201);
    contractA = created.body.id as string;

    const doc = await request(app.getHttpServer())
      .post(`/contracts/${contractA}/documents`)
      .set('Cookie', cookieA)
      .field('type', 'aditivo')
      .field('title', 'Aditivo preços assistido')
      .field('effectiveAt', '2024-08-01')
      .attach('file', pdfBytes, {
        filename: 'aditivo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    docA = doc.body.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('extract → pending → accept → priceAt reflects; reject does not apply', async () => {
    const extract = await request(app.getHttpServer())
      .post(`/contracts/${contractA}/documents/${docA}/extract-assisted`)
      .set('Cookie', cookieA)
      .send([
        {
          path: `prices.${priceCode}.amount`,
          value: 325,
          confidence: 0.9,
        },
        {
          path: `prices.${priceCode}.effectiveAt`,
          value: '2024-08-01',
          confidence: 0.9,
        },
        {
          path: 'coverage.10101012.action',
          value: 'exclude',
          confidence: 0.7,
        },
        {
          path: 'prices.99999999.amount',
          value: 999,
          confidence: 0.5,
        },
      ])
      .expect(200);

    expect(extract.body.fieldCount).toBe(4);
    expect(
      (extract.body.fields as Array<{ status: string }>).every(
        (f) => f.status === 'pending_review',
      ),
    ).toBe(true);

    const beforePrice = await request(app.getHttpServer())
      .get(`/contracts/${contractA}/prices/${priceCode}`)
      .query({ at: '2024-08-02' })
      .set('Cookie', cookieA)
      .expect(200);
    expect(beforePrice.body.amount).toBeUndefined();

    const queue = await request(app.getHttpServer())
      .get('/review-queue')
      .query({ contractId: contractA })
      .set('Cookie', cookieA)
      .expect(200);

    expect(queue.body.items.length).toBeGreaterThanOrEqual(4);
    const amountField = (
      queue.body.items as Array<{ id: string; path: string }>
    ).find((i) => i.path === `prices.${priceCode}.amount`);
    const effField = (
      queue.body.items as Array<{ id: string; path: string }>
    ).find((i) => i.path === `prices.${priceCode}.effectiveAt`);
    const rejectField = (
      queue.body.items as Array<{ id: string; path: string }>
    ).find((i) => i.path === 'prices.99999999.amount');
    expect(amountField).toBeTruthy();
    expect(effField).toBeTruthy();
    expect(rejectField).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/extracted-fields/${effField!.id}/accept`)
      .set('Cookie', cookieA)
      .send({})
      .expect(200);

    const accepted = await request(app.getHttpServer())
      .post(`/extracted-fields/${amountField!.id}/accept`)
      .set('Cookie', cookieA)
      .send({})
      .expect(200);

    expect(accepted.body.field.status).toBe('accepted');
    expect(accepted.body.dossierVersion?.version).toBeGreaterThanOrEqual(1);

    const afterPrice = await request(app.getHttpServer())
      .get(`/contracts/${contractA}/prices/${priceCode}`)
      .query({ at: '2024-08-02' })
      .set('Cookie', cookieA)
      .expect(200);
    expect(afterPrice.body.amount).toBe(325);
    expect(afterPrice.body.covered).toBe(true);

    await request(app.getHttpServer())
      .post(`/extracted-fields/${rejectField!.id}/reject`)
      .set('Cookie', cookieA)
      .expect(200);

    const rejectedPrice = await request(app.getHttpServer())
      .get(`/contracts/${contractA}/prices/99999999`)
      .query({ at: '2024-08-02' })
      .set('Cookie', cookieA)
      .expect(200);
    expect(rejectedPrice.body.amount).toBeUndefined();
  });

  it('export.json includes snapshotHash and is stable for same state', async () => {
    const a = await request(app.getHttpServer())
      .get(`/contracts/${contractA}/export.json`)
      .set('Cookie', cookieA)
      .expect(200);

    expect(a.body.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.body.contractId).toBe(contractA);
    expect(Array.isArray(a.body.documents)).toBe(true);
    expect(a.body.documents.some((d: { id: string }) => d.id === docA)).toBe(
      true,
    );

    const b = await request(app.getHttpServer())
      .get(`/contracts/${contractA}/export.json`)
      .set('Cookie', cookieA)
      .expect(200);

    // exportedAt differs — hash excludes it (computed from body without exportedAt)
    expect(b.body.snapshotHash).toBe(a.body.snapshotHash);
    expect(createHash('sha256').update('x').digest('hex')).toHaveLength(64);
  });

  it('tenant B cannot see tenant A review queue or accept fields', async () => {
    const queueB = await request(app.getHttpServer())
      .get('/review-queue')
      .query({ contractId: contractA })
      .set('Cookie', cookieB)
      .expect(200);

    expect(queueB.body.items).toEqual([]);

    const pending = await prisma.extractedField.findFirst({
      where: {
        status: 'pending_review',
        batch: { document: { contractId: contractA } },
      },
    });
    expect(pending).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/extracted-fields/${pending!.id}/accept`)
      .set('Cookie', cookieB)
      .send({})
      .expect(404);

    await request(app.getHttpServer())
      .get(`/contracts/${contractA}/export.json`)
      .set('Cookie', cookieB)
      .expect(404);
  });
});
