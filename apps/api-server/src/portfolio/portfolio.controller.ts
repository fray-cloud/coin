import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetPortfolioSummaryQuery } from './queries';
import type { User } from '@coin/database';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: User): Promise<unknown> {
    return this.queryBus.execute(new GetPortfolioSummaryQuery(user.id));
  }
}
