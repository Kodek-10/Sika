import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards';
import { Roles } from '../auth/guards';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * FR-007 — déclenche un versement d'incitation. Vérifie BR-003.
   * Contrat spec : « Réponse 200 » (le défaut NestJS d'un @Post est 201),
   * cohérent avec l'idempotence : un rejeu renvoie 200, pas un second 201.
   */
  @Post('payout')
  @Roles('agent', 'mmpe')
  @HttpCode(200)
  async payout(@Body() dto: CreatePayoutDto, @Req() req: { user: AuthenticatedUser }) {
    const result = await this.paymentsService.payout(dto, req.user.userId);
    return {
      status: result.status === 'completed' ? 'completed' : 'initiated',
      transactionRef: result.transactionRef,
      alreadyProcessed: result.alreadyProcessed,
    };
  }

  /** FR-005 — historique des versements. Le producteur ne voit QUE les siens. */
  @Get(':producerId')
  @Roles('producteur', 'agent', 'imf', 'mmpe')
  findByProducer(
    @Param('producerId', ParseUUIDPipe) producerId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    // FR-006 : donnée financière — jamais visible d'un producteur à l'autre.
    if (req.user.role === 'producteur' && req.user.producerId !== producerId) {
      throw new ForbiddenException({
        message: 'Un producteur ne peut consulter que ses propres versements',
        error: 'ERR-403-ROLE-FORBIDDEN',
      });
    }
    return this.paymentsService.findByProducer(producerId);
  }
}
