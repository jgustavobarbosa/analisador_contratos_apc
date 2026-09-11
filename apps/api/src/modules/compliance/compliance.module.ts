import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DossierModule } from '../dossier/dossier.module';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';

@Module({
  imports: [IdentityModule, DossierModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
