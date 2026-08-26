import { IsIn, IsOptional } from 'class-validator';
import type { AlertResolvedFilter } from '../scoring.service';

/**
 * Filtre de `GET /alerts`. Défaut `false` = alertes actives seules (FR-010).
 *
 * La valeur est contrainte ici plutôt que dans le service : `whitelist` +
 * `forbidNonWhitelisted` du ValidationPipe global rejettent toute autre
 * valeur en 400 avant d'atteindre la couche SQL.
 */
export class ListAlertsQueryDto {
  @IsOptional()
  @IsIn(['false', 'true', 'all'])
  resolved?: AlertResolvedFilter;
}
