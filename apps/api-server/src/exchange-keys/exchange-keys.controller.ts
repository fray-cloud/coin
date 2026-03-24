import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExchangeKeysService } from './exchange-keys.service';
import { CreateExchangeKeyDto } from './dto/create-exchange-key.dto';
import type { User } from '@coin/database';

@Controller('exchange-keys')
export class ExchangeKeysController {
  constructor(private readonly service: ExchangeKeysService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateExchangeKeyDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.delete(user.id, id);
  }

  @Get(':id/balances')
  async getBalances(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getBalances(user.id, id);
  }

  @Get(':id/orders')
  async getOpenOrders(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('symbol') symbol?: string,
  ) {
    return this.service.getOpenOrders(user.id, id, symbol);
  }
}
