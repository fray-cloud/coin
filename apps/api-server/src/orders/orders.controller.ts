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
import { CreateOrderCommand, CancelOrderCommand } from './commands';
import { GetOrdersQuery, GetOrderQuery } from './queries';
import { CreateOrderDto } from './dto/create-order.dto';
import type { User } from '@coin/database';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order on the specified exchange' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.commandBus.execute(new CreateOrderCommand(user.id, dto));
  }

  @Get()
  @ApiOperation({ summary: 'List orders with optional filtering and cursor pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of orders returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  @ApiQuery({ name: 'exchange', required: false, description: 'Filter by exchange' })
  @ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'Filter by trading mode (paper or real)',
  })
  @ApiQuery({ name: 'side', required: false, description: 'Filter by order side (buy or sell)' })
  async findAll(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('exchange') exchange?: string,
    @Query('symbol') symbol?: string,
    @Query('mode') mode?: string,
    @Query('side') side?: string,
  ) {
    return this.queryBus.execute(
      new GetOrdersQuery(
        user.id,
        cursor,
        limit ? parseInt(limit, 10) : undefined,
        status,
        exchange,
        symbol,
        mode,
        side,
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific order by its ID' })
  @ApiResponse({ status: 200, description: 'Order details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetOrderQuery(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending order by its ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new CancelOrderCommand(user.id, id));
  }
}
