export class GetBacktestsQuery {
  constructor(
    public readonly userId: string,
    public readonly flowId: string,
  ) {}
}
