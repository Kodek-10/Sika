import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards';
import { Roles } from '../auth/guards';
import { ScoringService } from './scoring.service';

/**
 * `GET /producers/:id/score` — contrat critique inter-devs.
 * Contrôleur distinct de ProducersController : le score appartient au domaine
 * scoring (Dev 1 / packages/scoring-engine), pas au CRUD producteur.
 */
@Controller('producers')
export class ScoreController {
  constructor(private scoringService: ScoringService) {}

  @Get(':id/score')
  @Roles('producteur', 'agent', 'imf', 'mmpe')
  getScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    // FR-006 : un producteur ne consulte que son propre score — un score
    // conditionne l'accès au crédit, il ne fuite jamais entre producteurs.
    if (req.user.role === 'producteur' && req.user.producerId !== id) {
      throw new ForbiddenException({
        message: 'Un producteur ne peut consulter que son propre score',
        error: 'ERR-403-ROLE-FORBIDDEN',
      });
    }
    return this.scoringService.getProducerScore(id);
  }
}
