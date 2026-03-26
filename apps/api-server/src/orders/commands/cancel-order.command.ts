export class CancelOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
