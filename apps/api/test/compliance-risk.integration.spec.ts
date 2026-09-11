import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EXCLUDED_CODE } from '../fixtures/contracts/unimed-oncoradium/golden';
import { cookieFrom, createTestApp, seedTenant } from './test-utils';

describe('Compliance + risk (Wave D)', () => {
  let app: INestApplication;
  const tenantId = '66666666-6666-4666-8666-666666666666';
  const password = 'SecurePass1!';
  const email = 'compliance-admin@example.com';
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('ensures RN510 checklist with at least 10 items', async () => {
    const res = await request(app.getHttpServer())
      .post(`/compliance/ensure/${contractId}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.total).toBeGreaterThanOrEqual(10);
    expect(res.body.items.length).toBeGreaterThanOrEqual(10);
    expect(res.body.created).toBeGreaterThanOrEqual(10);

    const again = await request(app.getHttpServer())
      .post(`/compliance/ensure/${contractId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(again.body.created).toBe(0);
    expect(again.body.total).toBe(res.body.total);

    const list = await request(app.getHttpServer())
      .get(`/compliance/${contractId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(10);
  });

  it('computes alert levels 60/30/7/expired from dueAt', async () => {
    const list = await request(app.getHttpServer())
      .get(`/compliance/${contractId}`)
      .set('Cookie', cookie)
      .expect(200);

    const item = list.body.items[0] as { id: string; alertLevel: unknown };
    expect(item.alertLevel).toBeNull();

    const today = new Date();
    const in5 = new Date(today);
    in5.setUTCDate(in5.getUTCDate() + 5);
    const due5 = in5.toISOString().slice(0, 10);

    const patched7 = await request(app.getHttpServer())
      .patch(`/compliance/items/${item.id}`)
      .set('Cookie', cookie)
      .send({ dueAt: due5, status: 'expiring' })
      .expect(200);
    expect(patched7.body.alertLevel).toBe(7);

    const in20 = new Date(today);
    in20.setUTCDate(in20.getUTCDate() + 20);
    const patched30 = await request(app.getHttpServer())
      .patch(`/compliance/items/${item.id}`)
      .set('Cookie', cookie)
      .send({ dueAt: in20.toISOString().slice(0, 10) })
      .expect(200);
    expect(patched30.body.alertLevel).toBe(30);

    const in45 = new Date(today);
    in45.setUTCDate(in45.getUTCDate() + 45);
    const patched60 = await request(app.getHttpServer())
      .patch(`/compliance/items/${item.id}`)
      .set('Cookie', cookie)
      .send({ dueAt: in45.toISOString().slice(0, 10) })
      .expect(200);
    expect(patched60.body.alertLevel).toBe(60);

    const past = new Date(today);
    past.setUTCDate(past.getUTCDate() - 2);
    const patchedExp = await request(app.getHttpServer())
      .patch(`/compliance/items/${item.id}`)
      .set('Cookie', cookie)
      .send({ dueAt: past.toISOString().slice(0, 10), status: 'expired' })
      .expect(200);
    expect(patchedExp.body.alertLevel).toBe('expired');
  });

  it('marks risk high when code is not covered', async () => {
    const res = await request(app.getHttpServer())
      .post('/simulations')
      .set('Cookie', cookie)
      .send({
        contractId,
        code: EXCLUDED_CODE,
        attendanceAt: '2024-07-09',
        informedAmount: 100,
      })
      .expect(200);

    expect(res.body.covered).toBe(false);
    expect(res.body.risk).toBeTruthy();
    expect(res.body.risk.level).toBe('high');
    expect(res.body.risk.score).toBeGreaterThanOrEqual(50);
    expect(res.body.riskNotes.level).toBe('high');
  });

  it('exports risk feature keys for contract', async () => {
    const res = await request(app.getHttpServer())
      .get(`/risk/features/${contractId}`)
      .query({ code: EXCLUDED_CODE, at: '2024-07-09' })
      .set('Cookie', cookie)
      .expect(200);

    expect(Array.isArray(res.body.keys)).toBe(true);
    expect(res.body.keys.length).toBeGreaterThan(5);
    expect(res.body.keys).toEqual(
      expect.arrayContaining([
        'covered',
        'not_covered',
        'amount_mismatch',
        'compliance_expired_count',
        'risk_score',
      ]),
    );
    expect(res.body.features).toBeTruthy();
    expect(res.body.features.not_covered).toBe(true);
  });
});
