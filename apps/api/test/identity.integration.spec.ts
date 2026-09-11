import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthService } from '../src/modules/identity/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cookieFrom,
  createTestApp,
  seedTenant,
} from './test-utils';

describe('Identity integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: AuthService;

  const tenantA = '11111111-1111-4111-8111-111111111111';
  const tenantB = '22222222-2222-4222-8222-222222222222';
  const password = 'SecurePass1!';

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    auth = app.get(AuthService);

    await seedTenant(prisma, {
      tenantId: tenantA,
      adminEmail: 'admin-a@example.com',
      adminPassword: password,
      extraAdminEmail: 'admin-a2@example.com',
      extraAdminPassword: password,
      readerEmail: 'reader-a@example.com',
      readerPassword: password,
    });

    await seedTenant(prisma, {
      tenantId: tenantB,
      adminEmail: 'admin-b@example.com',
      adminPassword: password,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('login success returns me payload and sets cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-a@example.com', password })
      .expect(200);

    expect(res.body.email).toBe('admin-a@example.com');
    expect(res.body.tenantId).toBe(tenantA);
    expect(res.body.permissions).toEqual(
      expect.arrayContaining(['user:write', 'user:read']),
    );
    expect(res.headers['set-cookie']).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', cookieFrom(res))
      .expect(200);
    expect(me.body.email).toBe('admin-a@example.com');
  });

  it('login failure is generic', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-a@example.com', password: 'WrongPass99' })
      .expect(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('password reset flow completes and revokes sessions', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-a@example.com', password })
      .expect(200);
    const sessionCookie = cookieFrom(login);

    await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: 'admin-a@example.com' })
      .expect(202);

    const token = auth.lastResetTokens.get('admin-a@example.com');
    expect(token).toBeTruthy();

    const newPassword = 'NewSecure99!';
    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({ token, newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', sessionCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-a@example.com', password: newPassword })
      .expect(200);

    // restore for later tests
    await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: 'admin-a@example.com' })
      .expect(202);
    const restoreToken = auth.lastResetTokens.get('admin-a@example.com');
    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({ token: restoreToken, newPassword: password })
      .expect(200);
  });

  it('password reset request does not reveal e-mail existence', async () => {
    const known = await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: 'admin-a@example.com' })
      .expect(202);
    const unknown = await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: 'nobody@example.com' })
      .expect(202);
    expect(known.body).toEqual(unknown.body);
  });

  it('denies IDOR cross-tenant user access', async () => {
    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-a@example.com', password })
      .expect(200);

    const userB = await prisma.user.findFirstOrThrow({
      where: { tenantId: tenantB, email: 'admin-b@example.com' },
    });

    await request(app.getHttpServer())
      .patch(`/users/${userB.id}`)
      .set('Cookie', cookieFrom(loginA))
      .send({ roleCode: 'somente_leitura' })
      .expect(404);

    const stillAdmin = await prisma.user.findUniqueOrThrow({
      where: { id: userB.id },
      include: { role: true },
    });
    expect(stillAdmin.role.code).toBe('admin');
    expect(stillAdmin.tenantId).toBe(tenantB);
  });

  it('protects last admin from disable', async () => {
    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-b@example.com', password })
      .expect(200);

    const adminB = await prisma.user.findFirstOrThrow({
      where: { tenantId: tenantB, email: 'admin-b@example.com' },
    });

    await request(app.getHttpServer())
      .post(`/users/${adminB.id}/disable`)
      .set('Cookie', cookieFrom(loginB))
      .expect(403);
  });

  it('allows disable when another admin exists', async () => {
    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-a@example.com', password })
      .expect(200);

    const second = await prisma.user.findFirstOrThrow({
      where: { tenantId: tenantA, email: 'admin-a2@example.com' },
    });

    const res = await request(app.getHttpServer())
      .post(`/users/${second.id}/disable`)
      .set('Cookie', cookieFrom(loginA))
      .expect(200);

    expect(res.body.status).toBe('disabled');
  });

  it('RBAC blocks user:write for somente_leitura', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'reader-a@example.com', password })
      .expect(200);

    await request(app.getHttpServer())
      .get('/users')
      .set('Cookie', cookieFrom(login))
      .expect(200);

    await request(app.getHttpServer())
      .post('/users')
      .set('Cookie', cookieFrom(login))
      .send({
        email: 'new@example.com',
        password: 'SecurePass1!',
        roleCode: 'juridico',
      })
      .expect(403);
  });
});
