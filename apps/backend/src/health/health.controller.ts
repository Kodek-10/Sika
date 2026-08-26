import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/guards';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
