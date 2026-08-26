import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../auth/guards';
import { CreateProducerDto } from './dto/create-producer.dto';
import { ProducersService } from './producers.service';

@Controller('producers')
export class ProducersController {
  constructor(private producersService: ProducersService) {}

  @Post()
  @Roles('agent')
  create(@Body() dto: CreateProducerDto) {
    return this.producersService.create(dto);
  }

  @Get(':id')
  @Roles('agent', 'imf', 'mmpe')
  @HttpCode(200)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.producersService.findOne(id);
  }
}
