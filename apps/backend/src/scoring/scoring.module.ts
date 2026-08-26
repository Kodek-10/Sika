import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { ScoringService } from './scoring.service';
import { YieldModelAdapter } from './yield-model.adapter';

@Module({
  controllers: [AlertsController],
  providers: [ScoringService, YieldModelAdapter],
  exports: [ScoringService],
})
export class ScoringModule {}
