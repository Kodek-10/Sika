import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const ACTIVITY_TYPES = [
  'elevage_volaille',
  'elevage_bovin',
  'elevage_porcin',
  'restaurant_collectif',
] as const;

export class CreateProducerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(/^\+[0-9]{8,15}$/, { message: 'phoneNumber doit être au format international (+225...)' })
  phoneNumber!: string;

  @IsIn(ACTIVITY_TYPES as unknown as string[])
  activityType!: (typeof ACTIVITY_TYPES)[number];

  @IsNumber()
  @Min(0)
  capacityDeclared!: number;

  @IsString()
  @IsNotEmpty()
  zone!: string;

  @IsIn(['sud', 'nord'])
  climateZone!: 'sud' | 'nord';

  @Matches(/^[A-Za-z0-9-]{4,40}$/, {
    message: 'meterSerialNumber doit contenir entre 4 et 40 caractères alphanumériques',
  })
  meterSerialNumber!: string;

  @IsOptional()
  @Matches(/^[0-9]{4}$/, { message: 'pin doit contenir exactement 4 chiffres' })
  pin?: string;
}
