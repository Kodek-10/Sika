import { Type } from 'class-transformer';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';

/** Bornes de plausibilité — au-delà, c'est une erreur de saisie (FRB-003). */
const QUANTITE_KG_MAX = 100_000;
const DUREE_HEURES_MAX = 24 * 31; // un mois de fonctionnement continu
const LECTURE_M3_MAX = 100_000;

export class GeoLocationDto {
  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}

export class CreateDeclarationDto {
  /**
   * UUID généré par le client AU MOMENT de la création dans la file locale
   * (guide-connecteur §2). C'est lui qui porte l'idempotence : renvoyer deux
   * fois le même identifiant après une coupure réseau ne crée pas de doublon.
   * Il devient directement `declarations.id` — d'où l'absence de DEFAULT sur
   * cette colonne dans la migration 0001.
   */
  @IsUUID()
  declarationId!: string;

  @IsUUID()
  producerId!: string;

  @IsString()
  @IsNotEmpty()
  substrate!: string;

  @IsNumber()
  @IsPositive()
  @Max(QUANTITE_KG_MAX)
  quantityKg!: number;

  @IsNumber()
  @IsPositive()
  @Max(DUREE_HEURES_MAX)
  durationHours!: number;

  @IsNumber()
  @Min(0)
  @Max(LECTURE_M3_MAX)
  meterReadingM3!: number;

  /** Doit pointer vers le stockage objet Sika — voir AntiFraudService (FRB-001). */
  @Matches(/^storage:\/\/\S+$/, {
    message: 'meterPhotoUrl doit référencer le stockage Sika (storage://...)',
  })
  meterPhotoUrl!: string;

  /**
   * Horodatage produit par la capture in-app (INV-002). Sa PLAUSIBILITÉ est
   * réévaluée côté serveur par AntiFraudService : une valeur fantaisiste
   * n'est pas rejetée en 400, elle dégrade le signal de preuve — c'est le
   * scoring qui sanctionne, pas la validation.
   */
  @IsDateString()
  capturedAt!: string;

  @ValidateNested()
  @Type(() => GeoLocationDto)
  geoLocation!: GeoLocationDto;
}
