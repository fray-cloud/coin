export class GetMarketsQuery {
  constructor(
    public readonly userId: string,
    public readonly exchangeKeyId: string,
  ) {}
}
