import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { OrganizationType } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword } from '../src/modules/identity/auth/crypto.util';
import {
  PERMISSIONS,
  ROLE_PERMISSION_MAP,
} from '../src/modules/identity/roles/role-catalog';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function seedPermissionsAndRoles(prisma: PrismaService) {
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code },
      update: {},
    });
  }

  for (const [code, perms] of Object.entries(ROLE_PERMISSION_MAP)) {
    let role = await prisma.role.findFirst({ where: { code, tenantId: null } });
    if (!role) {
      role = await prisma.role.create({
        data: { code, name: code, tenantId: null },
      });
    }
    const permissions = await prisma.permission.findMany({
      where: { code: { in: [...perms] } },
    });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }
}

export async function seedTenant(prisma: PrismaService, opts: {
  tenantId: string;
  adminEmail: string;
  adminPassword: string;
  extraAdminEmail?: string;
  extraAdminPassword?: string;
  readerEmail?: string;
  readerPassword?: string;
}) {
  await seedPermissionsAndRoles(prisma);

  const org = await prisma.organization.upsert({
    where: { tenantId: opts.tenantId },
    create: {
      tenantId: opts.tenantId,
      legalName: `Org ${opts.tenantId}`,
      document: '11.111.111/0001-11',
      type: OrganizationType.prestador,
    },
    update: {},
  });

  const adminRole = await prisma.role.findFirstOrThrow({
    where: { code: 'admin', tenantId: null },
  });
  const readerRole = await prisma.role.findFirstOrThrow({
    where: { code: 'somente_leitura', tenantId: null },
  });

  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: opts.tenantId, email: opts.adminEmail },
    },
    create: {
      tenantId: opts.tenantId,
      organizationId: org.id,
      email: opts.adminEmail,
      passwordHash: await hashPassword(opts.adminPassword),
      roleId: adminRole.id,
      status: 'active',
    },
    update: {
      passwordHash: await hashPassword(opts.adminPassword),
      status: 'active',
      roleId: adminRole.id,
    },
  });

  let extraAdmin = null;
  if (opts.extraAdminEmail && opts.extraAdminPassword) {
    extraAdmin = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: opts.tenantId,
          email: opts.extraAdminEmail,
        },
      },
      create: {
        tenantId: opts.tenantId,
        organizationId: org.id,
        email: opts.extraAdminEmail,
        passwordHash: await hashPassword(opts.extraAdminPassword),
        roleId: adminRole.id,
        status: 'active',
      },
      update: {
        passwordHash: await hashPassword(opts.extraAdminPassword),
        status: 'active',
      },
    });
  }

  let reader = null;
  if (opts.readerEmail && opts.readerPassword) {
    reader = await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: opts.tenantId, email: opts.readerEmail },
      },
      create: {
        tenantId: opts.tenantId,
        organizationId: org.id,
        email: opts.readerEmail,
        passwordHash: await hashPassword(opts.readerPassword),
        roleId: readerRole.id,
        status: 'active',
      },
      update: {
        passwordHash: await hashPassword(opts.readerPassword),
        status: 'active',
      },
    });
  }

  return { org, admin, extraAdmin, reader };
}

export function cookieFrom(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((c) => String(c).split(';')[0]).join('; ');
}
