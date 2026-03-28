export class DeleteStrategyCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}
