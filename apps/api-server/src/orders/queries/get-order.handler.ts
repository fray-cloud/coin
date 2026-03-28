import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetOrderQuery } from './get-order.query';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrderQuery) {
    const order = await this.prisma.order.findFirst({
      where: { id: query.orderId, userId: query.userId },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
