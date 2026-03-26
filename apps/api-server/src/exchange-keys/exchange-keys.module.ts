import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ExchangeKeysController } from './exchange-keys.controller';
import { ExchangeKeyCommandHandlers } from './commands';
import { ExchangeKeyQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ExchangeKeysController],
  providers: [...ExchangeKeyCommandHandlers, ...ExchangeKeyQueryHandlers],
})
export class ExchangeKeysModule {}
