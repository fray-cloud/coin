export class GetBalancesQuery {
  constructor(
    public readonly userId: string,
    public readonly exchangeKeyId: string,
  ) {}
}
