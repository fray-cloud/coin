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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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

@ApiTags('Exchange Keys')
@ApiBearerAuth('access-token')
@Controller('exchange-keys')
export class ExchangeKeysController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a new exchange API key pair' })
  @ApiResponse({ status: 201, description: 'Exchange key registered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@CurrentUser() user: User, @Body() dto: CreateExchangeKeyDto) {
    return this.commandBus.execute(new CreateExchangeKeyCommand(user.id, dto));
  }

  @Get()
  @ApiOperation({ summary: 'List all registered exchange API keys for the current user' })
  @ApiResponse({ status: 200, description: 'List of exchange keys returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetExchangeKeysQuery(user.id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a registered exchange API key' })
  @ApiResponse({ status: 200, description: 'Exchange key deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'Exchange key ID' })
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteExchangeKeyCommand(user.id, id));
  }

  @Get(':id/balances')
  @ApiOperation({ summary: 'Fetch account balances from the exchange via stored API key' })
  @ApiResponse({ status: 200, description: 'Exchange balances returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'Exchange key ID' })
  async getBalances(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetBalancesQuery(user.id, id));
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Fetch open orders from the exchange, optionally filtered by symbol' })
  @ApiResponse({ status: 200, description: 'Open orders returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'Exchange key ID' })
  @ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
  async getOpenOrders(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('symbol') symbol?: string,
  ) {
    return this.queryBus.execute(new GetOpenOrdersQuery(user.id, id, symbol));
  }

  @Get(':id/markets')
  @ApiOperation({ summary: 'Fetch available markets from the exchange' })
  @ApiResponse({ status: 200, description: 'Exchange markets returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'Exchange key ID' })
  async getMarkets(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetMarketsQuery(user.id, id));
  }
}
