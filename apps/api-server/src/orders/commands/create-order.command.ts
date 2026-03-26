import { CreateOrderDto } from '../dto/create-order.dto';

export class CreateOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: CreateOrderDto,
  ) {}
}
