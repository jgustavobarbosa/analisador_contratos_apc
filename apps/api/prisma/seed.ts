import { PrismaClient, OrganizationType } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  PERMISSIONS,
  ROLE_NAMES,
  ROLE_PERMISSION_MAP,
} from '../src/modules/identity/roles/role-catalog';
import { seedCatalog } from './catalog-seed-data';

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function ensureSystemRole(code: string) {
  const existing = await prisma.role.findFirst({
    where: { code, tenantId: null },
  });
  if (existing) {
    return prisma.role.update({
      where: { id: existing.id },
      data: { name: ROLE_NAMES[code] ?? code },
    });
  }
  return prisma.role.create({
    data: { code, name: ROLE_NAMES[code] ?? code, tenantId: null },
  });
}

async function main() {
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code },
      update: {},
    });
  }

  for (const [code, perms] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = await ensureSystemRole(code);
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

  const tenantId = '00000000-0000-4000-8000-000000000001';
  const org = await prisma.organization.upsert({
    where: { tenantId },
    create: {
      tenantId,
      legalName: 'Organização Demo RAY.IA',
      document: '00.000.000/0001-00',
      type: OrganizationType.prestador,
    },
    update: {},
  });

  const adminRole = await prisma.role.findFirstOrThrow({
    where: { code: 'admin', tenantId: null },
  });

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeAdmin1!';
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: {
      tenantId,
      organizationId: org.id,
      email,
      passwordHash,
      roleId: adminRole.id,
      status: 'active',
    },
    update: { passwordHash, roleId: adminRole.id, status: 'active' },
  });

  const catalog = await seedCatalog(prisma);
  console.log(
    `Seed OK: admin ${email} @ tenant ${tenantId}; catalog dims=${catalog.dimensions} instruments=${catalog.instruments}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
