export class GetOpenOrdersQuery {
  constructor(
    public readonly userId: string,
    public readonly exchangeKeyId: string,
    public readonly symbol?: string,
  ) {}
}
