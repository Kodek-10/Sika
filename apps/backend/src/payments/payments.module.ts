import { Module } from '@nestjs/common';
import { SimulatedMobileMoneyProvider } from '@sika/payments';
import { ScoringModule } from '../scoring/scoring.module';
import { PaymentsController } from './payments.controller';
import { MOBILE_MONEY_PROVIDER, PaymentsService } from './payments.service';

@Module({
  imports: [ScoringModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      // ⚠️ Opérateur SIMULÉ — aucun argent ne circule (PROJECT_OVERVIEW.md §4).
      // L'intégration réelle se fait en substituant cet unique provider :
      // rien d'autre dans le backend n'a à changer.
      provide: MOBILE_MONEY_PROVIDER,
      useFactory: () =>
        new SimulatedMobileMoneyProvider({
          comportement:
            (process.env.SIKA_MM_SIMULATION as 'disponible' | 'indisponible' | 'refus') ??
            'disponible',
        }),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
