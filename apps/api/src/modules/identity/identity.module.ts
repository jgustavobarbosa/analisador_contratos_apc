import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditTrailController } from './audit/audit-trail.controller';
import { AuditService } from './audit/audit.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PermissionsGuard, SessionAuthGuard } from './auth/session.guard';
import { OrganizationsController } from './organizations/organizations.controller';
import { RolesController } from './roles/roles.controller';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

@Module({
  controllers: [
    AuthController,
    UsersController,
    RolesController,
    OrganizationsController,
    AuditTrailController,
  ],
  providers: [
    AuthService,
    UsersService,
    AuditService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, UsersService, AuditService],
})
export class IdentityModule {}
