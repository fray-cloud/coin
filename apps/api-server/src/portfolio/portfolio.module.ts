import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PortfolioQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [PortfolioController],
  providers: [PortfolioService, ...PortfolioQueryHandlers],
})
export class PortfolioModule {}
