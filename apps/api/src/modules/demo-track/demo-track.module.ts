import { Module } from '@nestjs/common';
import { DemoTrackController } from './demo-track.controller';
import { DemoTrackService } from './demo-track.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DemoTrackController],
  providers: [DemoTrackService],
})
export class DemoTrackModule {}
