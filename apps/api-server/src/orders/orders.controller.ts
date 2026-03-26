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
import { CreateOrderCommand, CancelOrderCommand } from './commands';
import { GetOrdersQuery, GetOrderQuery } from './queries';
import { CreateOrderDto } from './dto/create-order.dto';
import type { User } from '@coin/database';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.commandBus.execute(new CreateOrderCommand(user.id, dto));
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryBus.execute(
      new GetOrdersQuery(user.id, cursor, limit ? parseInt(limit, 10) : undefined),
    );
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetOrderQuery(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new CancelOrderCommand(user.id, id));
  }
}
