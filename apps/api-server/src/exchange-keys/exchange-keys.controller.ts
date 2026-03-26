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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateExchangeKeyCommand, DeleteExchangeKeyCommand } from './commands';
import {
  GetExchangeKeysQuery,
  GetBalancesQuery,
  GetOpenOrdersQuery,
  GetMarketsQuery,
} from './queries';
import { CreateExchangeKeyDto } from './dto/create-exchange-key.dto';
import type { User } from '@coin/database';

@Controller('exchange-keys')
export class ExchangeKeysController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateExchangeKeyDto) {
    return this.commandBus.execute(new CreateExchangeKeyCommand(user.id, dto));
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetExchangeKeysQuery(user.id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteExchangeKeyCommand(user.id, id));
  }

  @Get(':id/balances')
  async getBalances(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetBalancesQuery(user.id, id));
  }

  @Get(':id/orders')
  async getOpenOrders(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('symbol') symbol?: string,
  ) {
    return this.queryBus.execute(new GetOpenOrdersQuery(user.id, id, symbol));
  }

  @Get(':id/markets')
  async getMarkets(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetMarketsQuery(user.id, id));
  }
}
