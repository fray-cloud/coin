export class CloseOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
