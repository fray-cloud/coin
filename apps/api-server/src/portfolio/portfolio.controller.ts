import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PortfolioService } from './portfolio.service';
import type { User } from '@coin/database';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: User): Promise<unknown> {
    return this.service.getSummary(user.id);
  }
}
