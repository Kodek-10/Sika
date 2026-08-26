import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { DatabaseService } from '../db/database.service';
import { CreateProducerDto } from './dto/create-producer.dto';

interface ProducerRow {
  id: string;
  name: string;
  phone_number: string;
  activity_type: string;
  capacity_declared: string;
  zone: string;
  climate_zone: string;
  meter_serial_number: string;
  created_at: Date;
}

@Injectable()
export class ProducersService {
  constructor(private db: DatabaseService) {}

  async create(dto: CreateProducerDto) {
    const pin = dto.pin ?? String(randomInt(1000, 10000));
    const pinHash = await bcrypt.hash(pin, 10);

    try {
      const producer = await this.db.withTransaction(async (query) => {
        const meterConflict = await query(
          'SELECT 1 FROM producers WHERE meter_serial_number = $1',
          [dto.meterSerialNumber],
        );
        if (meterConflict.rowCount > 0) {
          throw new MeterAlreadyAssignedError();
        }
        const phoneConflict = await query('SELECT 1 FROM users WHERE phone_number = $1', [
          dto.phoneNumber,
        ]);
        if (phoneConflict.rowCount > 0) {
          throw new PhoneAlreadyRegisteredError();
        }

        const inserted = await query<ProducerRow>(
          `INSERT INTO producers
             (name, phone_number, activity_type, capacity_declared, zone, climate_zone, meter_serial_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            dto.name,
            dto.phoneNumber,
            dto.activityType,
            dto.capacityDeclared,
            dto.zone,
            dto.climateZone,
            dto.meterSerialNumber,
          ],
        );

        await query(
          'INSERT INTO users (phone_number, pin_hash, role, producer_id) VALUES ($1, $2, $3, $4)',
          [dto.phoneNumber, pinHash, 'producteur', inserted.rows[0].id],
        );

        return inserted.rows[0];
      });

      return {
        producerId: producer.id,
        name: producer.name,
        phoneNumber: producer.phone_number,
        activityType: producer.activity_type,
        capacityDeclared: Number(producer.capacity_declared),
        zone: producer.zone,
        climateZone: producer.climate_zone,
        meterSerialNumber: producer.meter_serial_number,
        createdAt: producer.created_at,
        ...(dto.pin ? {} : { generatedPin: pin }),
      };
    } catch (error) {
      if (
        error instanceof MeterAlreadyAssignedError ||
        error instanceof PhoneAlreadyRegisteredError
      ) {
        throw error;
      }
      if (isUniqueViolation(error, 'producers_meter_serial_number_key')) {
        throw new MeterAlreadyAssignedError();
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const { rows } = await this.db.query<ProducerRow>(
      'SELECT * FROM producers WHERE id = $1',
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException({
        message: 'Producteur inexistant',
        error: 'ERR-404-PRODUCER-NOT-FOUND',
      });
    }
    const p = rows[0];
    return {
      producerId: p.id,
      name: p.name,
      phoneNumber: p.phone_number,
      activityType: p.activity_type,
      capacityDeclared: Number(p.capacity_declared),
      zone: p.zone,
      climateZone: p.climate_zone,
      meterSerialNumber: p.meter_serial_number,
      createdAt: p.created_at,
    };
  }
}

class MeterAlreadyAssignedError extends Error {}
class PhoneAlreadyRegisteredError extends Error {}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === '23505' &&
    (error as { constraint?: string }).constraint === constraint
  );
}
