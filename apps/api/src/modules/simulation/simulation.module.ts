import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DossierModule } from '../dossier/dossier.module';
import { RiskModule } from '../risk/risk.module';
import { SimulationService } from './simulation.service';
import { SimulationsController } from './simulations.controller';

@Module({
  imports: [IdentityModule, DossierModule, RiskModule],
  controllers: [SimulationsController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
