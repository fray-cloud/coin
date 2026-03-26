export class GetOrderQuery {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
