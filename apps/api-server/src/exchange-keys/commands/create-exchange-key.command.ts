import { CreateExchangeKeyDto } from '../dto/create-exchange-key.dto';

export class CreateExchangeKeyCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: CreateExchangeKeyDto,
  ) {}
}
