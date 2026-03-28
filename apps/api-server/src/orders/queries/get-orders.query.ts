export class GetOrdersQuery {
  constructor(
    public readonly userId: string,
    public readonly cursor?: string,
    public readonly limit: number = 20,
    public readonly status?: string,
    public readonly exchange?: string,
    public readonly symbol?: string,
    public readonly mode?: string,
    public readonly side?: string,
  ) {}
}
