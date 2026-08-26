import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import { AppModule } from '../src/app.module';

/**
 * Prérequis (voir apps/backend/README.md §Setup local) :
 *   docker-compose -f infra/docker-compose.yml up -d
 *   infra/migrations/apply.sh
 *   infra/seeds/demo-users.sh
 *
 * La base de test est la base locale de dev — les données créées ici sont
 * uniques par exécution (suffixe horodaté) pour rester idempotentes.
 */

// .env s'il existe ; sinon fallback sur le compose local.
dotenv.config();
process.env.DATABASE_URL ??=
  process.env.DATABASE_URL ??
  `postgres://sika:sika_dev@localhost:${process.env.SIKA_PG_PORT ?? 5432}/sika`;
process.env.JWT_SECRET ??= 'secret-e2e';
process.env.JWT_EXPIRES_IN ??= '1h';

export const COMPTES_DEMO = {
  producteur: { phoneNumber: '+2250700000001', pin: '1111' },
  agent: { phoneNumber: '+2250700000002', pin: '2222' },
  imf: { phoneNumber: '+2250700000003', pin: '2222' },
  mmpe: { phoneNumber: '+2250700000004', pin: '2222' },
};

/**
 * Suffixe unique par exécution — évite tout conflit 409 entre deux runs.
 * Chiffres uniquement : les téléphones doivent matcher ^\+[0-9]{8,15}$.
 */
export const RUN_ID = String(Date.now() % 1_000_000).padStart(6, '0');

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication({
    logger: ['error', 'warn'],
  });
  // Miroir exact du bootstrap de main.ts — toute divergence = un e2e menteur.
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
