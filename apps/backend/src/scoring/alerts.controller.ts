import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/guards';
import { ScoringService } from './scoring.service';

@Controller('alerts')
export class AlertsController {
  constructor(private scoringService: ScoringService) {}

  @Get()
  @Roles('agent', 'imf', 'mmpe')
  list() {
    return this.scoringService.listAlerts();
  }
}
