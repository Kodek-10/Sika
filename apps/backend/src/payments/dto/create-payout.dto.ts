import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

/**
 * Bornes du versement d'incitation. Le plafond n'est pas cosmétique :
 * il limite l'impact d'une erreur de saisie sur une opération financière.
 * Valeur à réviser avec le partenaire MMPE quand le barème sera arrêté.
 */
const MONTANT_MIN_FCFA = 500;
const MONTANT_MAX_FCFA = 500_000;

export class CreatePayoutDto {
  @IsUUID()
  producerId!: string;

  @IsInt({ message: 'amountFcfa doit être un entier — le FCFA n’a pas de subdivision' })
  @Min(MONTANT_MIN_FCFA)
  @Max(MONTANT_MAX_FCFA)
  amountFcfa!: number;

  /**
   * Clé d'idempotence fournie par l'appelant — premier filet anti-doublon,
   * plus fiable que la dérivation par fenêtre temporelle (voir
   * `packages/payments/src/idempotency.ts`). Fortement recommandée.
   */
  @IsOptional()
  @IsString()
  @Length(8, 128)
  idempotencyKey?: string;
}

/** Comportement du simulateur d'opérateur, réservé à la démo (jamais en production). */
export class SimulationDto {
  @IsOptional()
  @IsIn(['disponible', 'indisponible', 'refus'])
  comportement?: 'disponible' | 'indisponible' | 'refus';
}
