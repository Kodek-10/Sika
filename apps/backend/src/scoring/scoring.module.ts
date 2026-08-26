import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { YieldModelAdapter } from './yield-model.adapter';

@Module({
  providers: [ScoringService, YieldModelAdapter],
  exports: [ScoringService],
})
export class ScoringModule {}
