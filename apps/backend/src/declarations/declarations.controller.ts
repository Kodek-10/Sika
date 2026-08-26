import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards';
import { Roles } from '../auth/guards';
import { DeclarationsService } from './declarations.service';
import { CreateDeclarationDto } from './dto/create-declaration.dto';

@Controller('declarations')
export class DeclarationsController {
  constructor(private declarationsService: DeclarationsService) {}

  /**
   * FR-001, FR-002 — point d'entrée du flux central.
   * Contrat spec : « Réponse 200 » (le défaut NestJS d'un @Post est 201) —
   * cohérent avec l'idempotence : un rejeu renvoie 200, pas un second 201.
   */
  @Post()
  @Roles('producteur', 'agent')
  @HttpCode(200)
  create(
    @Body() dto: CreateDeclarationDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.declarationsService.create(dto, req.user);
  }

  /** FR-005 — historique déclaratif. */
  @Get(':producerId')
  @Roles('producteur', 'agent', 'imf', 'mmpe')
  findByProducer(
    @Param('producerId', ParseUUIDPipe) producerId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.declarationsService.findByProducer(producerId, req.user);
  }
}
