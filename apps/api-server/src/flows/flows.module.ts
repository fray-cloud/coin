import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FlowsController } from './flows.controller';
import { FlowCommandHandlers } from './commands';
import { FlowQueryHandlers } from './queries';
import { FlowsKafkaProducer } from './flows-kafka.producer';
import { FlowsKafkaConsumer } from './flows-kafka.consumer';

@Module({
  imports: [CqrsModule],
  controllers: [FlowsController],
  providers: [...FlowCommandHandlers, ...FlowQueryHandlers, FlowsKafkaProducer, FlowsKafkaConsumer],
  exports: [FlowsKafkaProducer, FlowsKafkaConsumer],
})
export class FlowsModule {}
