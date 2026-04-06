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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateFlowCommand,
  UpdateFlowCommand,
  DeleteFlowCommand,
  ToggleFlowCommand,
  RequestBacktestCommand,
} from './commands';
import { GetFlowsQuery, GetFlowQuery, GetBacktestsQuery, GetBacktestTraceQuery } from './queries';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { BacktestRequestDto } from './dto/backtest-request.dto';
import { FlowResponse, BacktestResponse, BacktestTraceListResponse } from './dto/flow-response.dto';
import type { User } from '@coin/database';

@ApiTags('Flows')
@ApiBearerAuth('access-token')
@Controller('flows')
export class FlowsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: '새 플로우 전략 생성' })
  @ApiResponse({ status: 201, description: '플로우 생성 성공', type: FlowResponse })
  async create(@CurrentUser() user: User, @Body() dto: CreateFlowDto) {
    return this.commandBus.execute(new CreateFlowCommand(user.id, dto));
  }

  @Get()
  @ApiOperation({ summary: '현재 사용자의 모든 플로우 조회' })
  @ApiResponse({ status: 200, description: '플로우 목록 반환', type: [FlowResponse] })
  async findAll(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetFlowsQuery(user.id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID로 특정 플로우 조회' })
  @ApiResponse({ status: 200, description: '플로우 상세 반환', type: FlowResponse })
  @ApiParam({ name: 'id', description: '플로우 ID' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetFlowQuery(user.id, id));
  }

  @Patch(':id')
  @ApiOperation({ summary: '플로우 정의/설정 수정' })
  @ApiResponse({ status: 200, description: '플로우 수정 성공', type: FlowResponse })
  @ApiParam({ name: 'id', description: '플로우 ID' })
  async update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateFlowDto) {
    return this.commandBus.execute(new UpdateFlowCommand(user.id, id, dto));
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: '플로우 활성/비활성 전환' })
  @ApiResponse({ status: 200, description: '플로우 전환 성공' })
  @ApiParam({ name: 'id', description: '플로우 ID' })
  async toggle(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new ToggleFlowCommand(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '플로우 영구 삭제' })
  @ApiResponse({ status: 200, description: '플로우 삭제 성공' })
  @ApiParam({ name: 'id', description: '플로우 ID' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteFlowCommand(user.id, id));
  }

  @Post(':id/backtest')
  @ApiOperation({ summary: '백테스트 실행 요청 (비동기)' })
  @ApiResponse({ status: 201, description: '백테스트 요청 접수' })
  @ApiParam({ name: 'id', description: '플로우 ID' })
  async requestBacktest(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: BacktestRequestDto,
  ) {
    return this.commandBus.execute(new RequestBacktestCommand(user.id, id, dto));
  }

  @Get(':id/backtests')
  @ApiOperation({ summary: '플로우의 백테스트 결과 목록' })
  @ApiResponse({ status: 200, description: '백테스트 목록', type: [BacktestResponse] })
  @ApiParam({ name: 'id', description: '플로우 ID' })
  async getBacktests(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetBacktestsQuery(user.id, id));
  }

  @Get(':id/backtests/:backtestId/trace')
  @ApiOperation({ summary: '백테스트 트레이스 조회 (페이지네이션)' })
  @ApiResponse({ status: 200, description: '트레이스 데이터', type: BacktestTraceListResponse })
  @ApiParam({ name: 'id', description: '플로우 ID' })
  @ApiParam({ name: 'backtestId', description: '백테스트 ID' })
  @ApiQuery({ name: 'from', required: false, description: '시작 시간 (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: '종료 시간 (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, description: '최대 결과 수 (기본 100)' })
  @ApiQuery({ name: 'offset', required: false, description: '오프셋' })
  async getBacktestTrace(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('backtestId') backtestId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.queryBus.execute(
      new GetBacktestTraceQuery(
        user.id,
        id,
        backtestId,
        from,
        to,
        limit ? parseInt(limit, 10) : undefined,
        offset ? parseInt(offset, 10) : undefined,
      ),
    );
  }
}
