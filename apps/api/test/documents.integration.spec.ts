import { createHash } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cookieFrom,
  createTestApp,
  seedTenant,
} from './test-utils';

describe('Contract document upload', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tenantA = '44444444-4444-4444-8444-444444444444';
  const tenantB = '55555555-5555-4555-8555-555555555555';
  const password = 'SecurePass1!';
  const emailA = 'upload-admin-a@example.com';
  const emailB = 'upload-admin-b@example.com';
  let cookieA = '';
  let cookieB = '';
  let contractA = '';

  const pdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
    'utf8',
  );

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
        partyA: 'Operadora A',
        partyB: 'Prestador A',
        title: 'Contrato upload test',
      })
      .expect(201);
    contractA = created.body.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('upload creates ContractDocument with sha256 checksum', async () => {
    const expectedChecksum = createHash('sha256').update(pdfBytes).digest('hex');

    const res = await request(app.getHttpServer())
      .post(`/contracts/${contractA}/documents`)
      .set('Cookie', cookieA)
      .field('type', 'contrato')
      .field('title', 'Contrato PDF teste')
      .attach('file', pdfBytes, {
        filename: 'contrato.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.type).toBe('contrato');
    expect(res.body.title).toBe('Contrato PDF teste');
    expect(res.body.checksum).toBe(expectedChecksum);
    expect(res.body.storageKey).toContain(tenantA);
    expect(res.body.storageKey).toContain(contractA);
    expect(res.body.uploadedBy).toBeTruthy();
    expect(res.body.uploadedAt).toBeTruthy();

    const listed = await request(app.getHttpServer())
      .get(`/contracts/${contractA}/documents`)
      .set('Cookie', cookieA)
      .expect(200);

    expect(Array.isArray(listed.body)).toBe(true);
    expect(listed.body.some((d: { id: string }) => d.id === res.body.id)).toBe(
      true,
    );

    const stored = await prisma.contractDocument.findUnique({
      where: { id: res.body.id as string },
    });
    expect(stored?.checksum).toBe(expectedChecksum);
    expect(stored?.storageKey).toBe(res.body.storageKey);
  });

  it('tenant B cannot list or upload to tenant A contract', async () => {
    await request(app.getHttpServer())
      .get(`/contracts/${contractA}/documents`)
      .set('Cookie', cookieB)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/contracts/${contractA}/documents`)
      .set('Cookie', cookieB)
      .field('type', 'aditivo')
      .attach('file', pdfBytes, {
        filename: 'intruso.pdf',
        contentType: 'application/pdf',
      })
      .expect(404);
  });
});
