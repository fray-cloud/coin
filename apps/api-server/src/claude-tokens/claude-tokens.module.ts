import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClaudeTokensController } from './claude-tokens.controller';
import { ClaudeTokensService } from './claude-tokens.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClaudeTokensController],
  providers: [ClaudeTokensService],
  exports: [ClaudeTokensService],
})
export class ClaudeTokensModule {}
