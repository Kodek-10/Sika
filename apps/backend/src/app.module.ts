import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { DbModule } from './db/db.module';
import { ProducersModule } from './producers/producers.module';
import { DeclarationsModule } from './declarations/declarations.module';
import { ScoringModule } from './scoring/scoring.module';
import { AuthModule } from './auth/auth.module';
import { AntiFraudModule } from './anti-fraud/anti-fraud.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    ProducersModule,
    DeclarationsModule,
    ScoringModule,
    AuthModule,
    AntiFraudModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
