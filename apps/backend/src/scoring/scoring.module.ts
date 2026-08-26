import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { ScoreController } from './score.controller';
import { ScoringService } from './scoring.service';
import { YieldModelAdapter } from './yield-model.adapter';

@Module({
  controllers: [AlertsController, ScoreController],
  providers: [ScoringService, YieldModelAdapter],
  exports: [ScoringService],
})
export class ScoringModule {}
