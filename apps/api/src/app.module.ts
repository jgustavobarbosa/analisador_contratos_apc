import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { DossierModule } from './modules/dossier/dossier.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { RiskModule } from './modules/risk/risk.module';
import { DemoTrackModule } from './modules/demo-track/demo-track.module';
import { AdvisorModule } from './modules/advisor/advisor.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    IdentityModule,
    DossierModule,
    CatalogModule,
    SimulationModule,
    ComplianceModule,
    RiskModule,
    DemoTrackModule,
    AdvisorModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
