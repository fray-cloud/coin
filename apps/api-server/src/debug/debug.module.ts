import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DebugController } from './debug.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DebugController],
})
export class DebugModule {}
