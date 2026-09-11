import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { seedCatalog } from '../prisma/catalog-seed-data';
import {
  cookieFrom,
  createTestApp,
  seedTenant,
} from './test-utils';

describe('Unimed PDF seed import', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tenantId = '77777777-7777-4777-8777-777777777777';
  const password = 'SecurePass1!';
  const email = 'unimed-pdf-admin@example.com';
  let cookie = '';

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;

    await seedTenant(prisma, {
      tenantId,
      adminEmail: email,
      adminPassword: password,
    });
    await seedCatalog(prisma);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    cookie = cookieFrom(login);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /contracts/seed/unimed-pdfs creates documents with checksum', async () => {
    const samplePath = join(
      process.cwd(),
      'fixtures/contracts/unimed-oncoradium/pdfs',
      'Comunicado_unimed_suspensao_consulta_eletiva_-_para_assinar_assinado.pdf',
    );
    const sampleBytes = readFileSync(samplePath);
    const expectedChecksum = createHash('sha256')
      .update(sampleBytes)
      .digest('hex');

    const res = await request(app.getHttpServer())
      .post('/contracts/seed/unimed-pdfs')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.contractId).toBeTruthy();
    expect(res.body.documents?.length).toBeGreaterThanOrEqual(5);
    expect(res.body.imported + res.body.reused).toBe(
      res.body.documents.length,
    );

    const checksums = (
      res.body.documents as Array<{ checksum: string }>
    ).map((d) => d.checksum);
    expect(checksums).toContain(expectedChecksum);

    const docs = await prisma.contractDocument.findMany({
      where: { contractId: res.body.contractId as string },
    });
    const withChecksum = docs.filter((d) => d.checksum);
    expect(withChecksum.length).toBeGreaterThanOrEqual(5);
    const linked = docs.filter((d) => d.catalogInstrumentId);
    expect(linked.length).toBeGreaterThanOrEqual(5);

    // Idempotent second call
    const again = await request(app.getHttpServer())
      .post('/contracts/seed/unimed-pdfs')
      .set('Cookie', cookie)
      .expect(200);
    expect(again.body.reused).toBeGreaterThanOrEqual(5);
    expect(again.body.imported).toBe(0);
  });
});
