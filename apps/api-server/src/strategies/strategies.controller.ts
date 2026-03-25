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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StrategiesService } from './strategies.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import type { User } from '@coin/database';

@Controller('strategies')
export class StrategiesController {
  constructor(private readonly service: StrategiesService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateStrategyDto) {
    return this.service.createStrategy(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.service.getStrategies(user.id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getStrategy(user.id, id);
  }

  @Patch(':id')
  async update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    return this.service.updateStrategy(user.id, id, dto);
  }

  @Patch(':id/toggle')
  async toggle(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.toggleStrategy(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.deleteStrategy(user.id, id);
  }

  @Get(':id/logs')
  async getLogs(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getStrategyLogs(
      user.id,
      id,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
