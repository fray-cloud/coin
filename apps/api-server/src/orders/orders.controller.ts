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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import type { User } from '@coin/database';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.service.createOrder(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getOrders(user.id, cursor, limit ? parseInt(limit, 10) : undefined);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getOrder(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.cancelOrder(user.id, id);
  }
}
