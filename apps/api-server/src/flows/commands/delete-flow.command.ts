export class DeleteFlowCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}
