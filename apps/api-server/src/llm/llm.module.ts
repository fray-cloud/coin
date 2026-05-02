import { Module } from '@nestjs/common';
import { LlmCliService } from './llm-cli.service';

@Module({
  providers: [LlmCliService],
  exports: [LlmCliService],
})
export class LlmModule {}
