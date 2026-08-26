import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/guards';
import { ListAlertsQueryDto } from './dto/list-alerts.query.dto';
import { ScoringService } from './scoring.service';

@Controller('alerts')
export class AlertsController {
  constructor(private scoringService: ScoringService) {}

  /** FR-004, FR-010 — par défaut les alertes ACTIVES seules (`?resolved=true|all` pour élargir). */
  @Get()
  @Roles('agent', 'imf', 'mmpe')
  list(@Query() query: ListAlertsQueryDto) {
    return this.scoringService.listAlerts(query.resolved);
  }

  /**
   * Marque une alerte comme traitée après vérification terrain.
   * Réservé à `agent` et `mmpe` : l'IMF consulte mais n'arbitre pas le terrain.
   * Prérequis de BR-003 (éligibilité au versement).
   */
  @Patch(':id/resolve')
  @Roles('agent', 'mmpe')
  @HttpCode(200)
  resolve(@Param('id', ParseUUIDPipe) id: string) {
    return this.scoringService.resolveAlert(id);
  }
}
