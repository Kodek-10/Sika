import { Module } from '@nestjs/common';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';
import { ScoringModule } from '../scoring/scoring.module';
import { DeclarationsController } from './declarations.controller';
import { DeclarationsService } from './declarations.service';

@Module({
  imports: [ScoringModule, AntiFraudModule],
  controllers: [DeclarationsController],
  providers: [DeclarationsService],
})
export class DeclarationsModule {}
