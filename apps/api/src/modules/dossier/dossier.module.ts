import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ContractsController } from './contracts/contracts.controller';
import { ReviewController } from './extraction/review.controller';
import { DossierService } from './dossier.service';

@Module({
  imports: [IdentityModule],
  controllers: [ContractsController, ReviewController],
  providers: [DossierService],
  exports: [DossierService],
})
export class DossierModule {}
