import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateStrategyCommand,
  UpdateStrategyCommand,
  ToggleStrategyCommand,
  DeleteStrategyCommand,
} from './commands';
import {
  GetStrategiesQuery,
  GetStrategyQuery,
  GetStrategyLogsQuery,
  GetStrategyPerformanceQuery,
} from './queries';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import type { User } from '@coin/database';

@Controller('strategies')
export class StrategiesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateStrategyDto) {
    return this.commandBus.execute(new CreateStrategyCommand(user.id, dto));
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetStrategiesQuery(user.id));
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategyQuery(user.id, id));
  }

  @Patch(':id')
  async update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    return this.commandBus.execute(new UpdateStrategyCommand(user.id, id, dto));
  }

  @Patch(':id/toggle')
  async toggle(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new ToggleStrategyCommand(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteStrategyCommand(user.id, id));
  }

  @Get(':id/performance')
  async getPerformance(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategyPerformanceQuery(user.id, id));
  }

  @Get(':id/logs')
  async getLogs(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('signal') signal?: string,
  ) {
    return this.queryBus.execute(
      new GetStrategyLogsQuery(
        user.id,
        id,
        cursor,
        limit ? parseInt(limit, 10) : undefined,
        action,
        signal,
      ),
    );
  }
}
