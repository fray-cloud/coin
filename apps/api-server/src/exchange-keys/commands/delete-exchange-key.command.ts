export class DeleteExchangeKeyCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}
