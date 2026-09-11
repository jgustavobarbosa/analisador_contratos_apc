import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  CHEMO_ROOM_FEES,
  EXCLUDED_CODE,
} from '../fixtures/contracts/unimed-oncoradium/golden';
import {
  cookieFrom,
  createTestApp,
  seedTenant,
} from './test-utils';

describe('Dossier golden Oncoradium', () => {
  let app: INestApplication;
  const tenantId = '33333333-3333-4333-8333-333333333333';
  const password = 'SecurePass1!';
  const email = 'dossier-admin@example.com';
  let cookie = '';
  let contractId = '';

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    await seedTenant(ctx.prisma, {
      tenantId,
      adminEmail: email,
      adminPassword: password,
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    cookie = cookieFrom(login);

    const seed = await request(app.getHttpServer())
      .post('/contracts/seed/golden-oncoradium')
      .set('Cookie', cookie)
      .expect(200);
    contractId = seed.body.contractId as string;
    expect(contractId).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  it('timeline has expected golden events + causal link', async () => {
    const res = await request(app.getHttpServer())
      .get(`/contracts/${contractId}/timeline`)
      .set('Cookie', cookie)
      .expect(200);

    const titles = (res.body.events as Array<{ title: string }>).map(
      (e) => e.title,
    );
    expect(titles.some((t) => /Contrato original/i.test(t))).toBe(true);
    expect(titles.some((t) => /Notificação/i.test(t))).toBe(true);
    expect(titles.some((t) => /RN510/i.test(t))).toBe(true);
    expect(titles.some((t) => /10101012/i.test(t))).toBe(true);
    expect(titles.some((t) => /quimioterapia/i.test(t))).toBe(true);

    const notify = (
      res.body.events as Array<{
        title: string;
        causalLinks: Array<{ relation: string; direction: string }>;
      }>
    ).find((e) => /Notificação/i.test(e.title));
    expect(notify?.causalLinks.some((l) => l.relation === 'motivates')).toBe(
      true,
    );
  });

  it('10101012 not covered after 2024-07-09', async () => {
    const res = await request(app.getHttpServer())
      .get(`/contracts/${contractId}/prices/${EXCLUDED_CODE}`)
      .query({ at: '2024-07-09' })
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.covered).toBe(false);
    expect(res.body.amount).toBeUndefined();
  });

  it('chemo room fees priced at 2024-08-02 (retroactive before signature)', async () => {
    for (const fee of CHEMO_ROOM_FEES) {
      const res = await request(app.getHttpServer())
        .get(`/contracts/${contractId}/prices/${fee.code}`)
        .query({ at: '2024-08-02' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.covered).toBe(true);
      expect(res.body.amount).toBe(fee.amount);
    }
  });

  it('seed is idempotent', async () => {
    const again = await request(app.getHttpServer())
      .post('/contracts/seed/golden-oncoradium')
      .set('Cookie', cookie)
      .expect(200);
    expect(again.body.contractId).toBe(contractId);
    expect(again.body.reused).toBe(true);
  });
});
