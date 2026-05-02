import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClaudeTokensModule } from '../claude-tokens/claude-tokens.module';
import { LlmModule } from '../llm/llm.module';
import { LlmTradesController } from './llm-trades.controller';
import { LlmTradesService } from './llm-trades.service';
import { MarketContextService } from './market-context/market-context.service';

@Module({
  imports: [PrismaModule, ClaudeTokensModule, LlmModule],
  controllers: [LlmTradesController],
  providers: [LlmTradesService, MarketContextService],
})
export class LlmTradesModule {}
