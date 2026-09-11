import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  CHEMO_ROOM_FEES,
  EXCLUDED_CODE,
} from '../fixtures/contracts/unimed-oncoradium/golden';
import { cookieFrom, createTestApp, seedTenant } from './test-utils';

describe('Simulation + audit trail (Wave C)', () => {
  let app: INestApplication;
  const tenantId = '55555555-5555-4555-8555-555555555555';
  const password = 'SecurePass1!';
  const email = 'sim-admin@example.com';
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

  it('simulates covered chemo price with expected amount', async () => {
    const fee = CHEMO_ROOM_FEES[0];
    const started = Date.now();
    const res = await request(app.getHttpServer())
      .post('/simulations')
      .set('Cookie', cookie)
      .send({
        contractId,
        code: fee.code,
        attendanceAt: '2024-08-02',
        informedAmount: fee.amount,
      })
      .expect(200);
    expect(Date.now() - started).toBeLessThan(3000);

    expect(res.body.covered).toBe(true);
    expect(res.body.expectedAmount).toBe(fee.amount);
    expect(res.body.informedAmount).toBe(fee.amount);
    expect(res.body.alerts).toEqual([]);
    expect(res.body.id).toBeTruthy();
  });

  it('simulates excluded code 10101012 after exclusion date', async () => {
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
    expect(res.body.expectedAmount).toBeNull();
    expect(
      (res.body.alerts as Array<{ type: string }>).some(
        (a) => a.type === 'code_not_covered',
      ),
    ).toBe(true);
  });

  it('flags amount mismatch when informed differs', async () => {
    const fee = CHEMO_ROOM_FEES[1];
    const res = await request(app.getHttpServer())
      .post('/simulations')
      .set('Cookie', cookie)
      .send({
        contractId,
        code: fee.code,
        attendanceAt: '2024-08-02',
        informedAmount: fee.amount + 50,
      })
      .expect(200);

    expect(res.body.covered).toBe(true);
    expect(
      (res.body.alerts as Array<{ type: string }>).some(
        (a) => a.type === 'amount_mismatch',
      ),
    ).toBe(true);
  });

  it('runs batch and lists evidence', async () => {
    const batch = await request(app.getHttpServer())
      .post('/simulations/batch')
      .set('Cookie', cookie)
      .send([
        {
          contractId,
          code: CHEMO_ROOM_FEES[2].code,
          attendanceAt: '2024-08-02',
        },
        {
          contractId,
          code: EXCLUDED_CODE,
          attendanceAt: '2024-07-09',
        },
      ])
      .expect(200);

    expect(batch.body.batchId).toBeTruthy();
    expect(batch.body.count).toBe(2);
    expect(batch.body.results).toHaveLength(2);
    expect(batch.body.results[0].batchId).toBe(batch.body.batchId);

    const list = await request(app.getHttpServer())
      .get('/simulations')
      .query({ contractId, limit: 20 })
      .set('Cookie', cookie)
      .expect(200);

    expect(list.body.contractId).toBe(contractId);
    expect(list.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it('audit trail contains simulation_run for contract', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit-trail')
      .query({ contractId, limit: 50 })
      .set('Cookie', cookie)
      .expect(200);

    const actions = (res.body.items as Array<{ action: string }>).map(
      (i) => i.action,
    );
    expect(actions).toContain('simulation_run');
  });
});
