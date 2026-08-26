import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, RolesGuard } from './guards';

@Module({
  imports: [
    // Lecture PARESSEUSE de l'env : un register() direct capturerait process.env
    // à l'import du module, avant le chargement du .env (bug révélé par l'e2e).
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        // Sans secret, NestJS démarrait et ne cassait qu'au premier login —
        // un service « up » mais incapable d'authentifier. On échoue au boot.
        if (!secret) {
          throw new Error(
            'JWT_SECRET manquant : copier apps/backend/.env.example vers .env et le renseigner.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES_IN ?? '12h') as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
