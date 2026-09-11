import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { seedCatalog } from '../prisma/catalog-seed-data';
import {
  cookieFrom,
  createTestApp,
  seedTenant,
} from './test-utils';

describe('Catalog normative instruments', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tenantId = '66666666-6666-4666-8666-666666666666';
  const password = 'SecurePass1!';
  const email = 'catalog-admin@example.com';
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

  it('seed creates at least 14 catalog dimensions', async () => {
    const count = await prisma.catalogDimension.count();
    expect(count).toBeGreaterThanOrEqual(14);
  });

  it('GET /catalog/instruments returns ANS and caso_base entries', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/instruments')
      .set('Cookie', cookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const kinds = new Set(
      (res.body as Array<{ sourceKind: string }>).map((i) => i.sourceKind),
    );
    expect(kinds.has('ans')).toBe(true);
    expect(kinds.has('caso_base')).toBe(true);

    const ans = await request(app.getHttpServer())
      .get('/catalog/instruments?sourceKind=ans')
      .set('Cookie', cookie)
      .expect(200);
    expect(ans.body.length).toBeGreaterThanOrEqual(2);

    const base = await request(app.getHttpServer())
      .get('/catalog/instruments?sourceKind=caso_base')
      .set('Cookie', cookie)
      .expect(200);
    expect(base.body.length).toBe(5);
  });

  it('GET /catalog/dimensions and instrument by code', async () => {
    const dims = await request(app.getHttpServer())
      .get('/catalog/dimensions')
      .set('Cookie', cookie)
      .expect(200);
    expect(dims.body.length).toBeGreaterThanOrEqual(14);

    const one = await request(app.getHttpServer())
      .get('/catalog/instruments/ans-fator-de-qualidade')
      .set('Cookie', cookie)
      .expect(200);
    expect(one.body.code).toBe('ans-fator-de-qualidade');
    expect(one.body.sourceUrl).toContain('gov.br/ans');
  });
});
