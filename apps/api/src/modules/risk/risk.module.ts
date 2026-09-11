import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DossierModule } from '../dossier/dossier.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';

@Module({
  imports: [IdentityModule, DossierModule, ComplianceModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
