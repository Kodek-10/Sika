import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../db/database.service';
import { LoginDto } from './dto/login.dto';

interface UserRow {
  id: string;
  pin_hash: string;
  role: string;
  producer_id: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const { rows } = await this.db.query<UserRow>(
      'SELECT id, pin_hash, role, producer_id FROM users WHERE phone_number = $1',
      [dto.phoneNumber],
    );
    const user = rows[0];
    const valid = user ? await bcrypt.compare(dto.pin, user.pin_hash) : false;
    if (!user || !valid) {
      throw new UnauthorizedException({
        message: 'Numéro ou PIN incorrect',
        error: 'ERR-401-UNAUTHORIZED',
      });
    }

    return {
      accessToken: await this.jwtService.signAsync({
        userId: user.id,
        role: user.role,
        ...(user.producer_id ? { producerId: user.producer_id } : {}),
      }),
      role: user.role,
      userId: user.id,
    };
  }
}
