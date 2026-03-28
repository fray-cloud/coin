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
  GetStrategySignalsQuery,
} from './queries';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import type { User } from '@coin/database';

@ApiTags('Strategies')
@ApiBearerAuth('access-token')
@Controller('strategies')
export class StrategiesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: '새 트레이딩 전략 생성',
    description:
      '## 전략 실행 사이클\n\n' +
      '```mermaid\n' +
      'sequenceDiagram\n' +
      '  participant W as Worker\n' +
      '  participant R as Redis\n' +
      '  participant E as 거래소 API\n' +
      '  participant K as Kafka\n' +
      '  loop 매 intervalSeconds 마다\n' +
      '    W->>E: getCandles(symbol, candleInterval)\n' +
      '    E-->>W: OHLCV 데이터\n' +
      '    W->>R: 캔들 캐시\n' +
      '    W->>W: 지표 계산 (RSI/MACD/Bollinger)\n' +
      '    alt Signal 모드\n' +
      '      W->>K: StrategySignalEvent 발행\n' +
      '      K->>W: 알림 전송\n' +
      '    else Auto 모드\n' +
      '      W->>W: 리스크 체크\n' +
      '      W->>K: OrderRequestedEvent 발행\n' +
      '      K->>W: 주문 실행\n' +
      '    end\n' +
      '  end\n' +
      '```\n',
  })
  @ApiResponse({ status: 201, description: '전략 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async create(@CurrentUser() user: User, @Body() dto: CreateStrategyDto) {
    return this.commandBus.execute(new CreateStrategyCommand(user.id, dto));
  }

  @Get()
  @ApiOperation({ summary: '현재 사용자의 모든 전략 조회' })
  @ApiResponse({ status: 200, description: '전략 목록 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async findAll(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetStrategiesQuery(user.id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID로 특정 전략 조회' })
  @ApiResponse({ status: 200, description: '전략 상세 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategyQuery(user.id, id));
  }

  @Patch(':id')
  @ApiOperation({ summary: '기존 전략 설정 수정' })
  @ApiResponse({ status: 200, description: '전략 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    return this.commandBus.execute(new UpdateStrategyCommand(user.id, id, dto));
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: '전략 활성/비활성 전환' })
  @ApiResponse({ status: 200, description: '전략 전환 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async toggle(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new ToggleStrategyCommand(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '전략 영구 삭제' })
  @ApiResponse({ status: 200, description: '전략 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteStrategyCommand(user.id, id));
  }

  @Get(':id/performance')
  @ApiOperation({ summary: '전략 성과 지표 조회' })
  @ApiResponse({ status: 200, description: '전략 성과 데이터 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async getPerformance(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategyPerformanceQuery(user.id, id));
  }

  @Get(':id/signals')
  @ApiOperation({ summary: '전략이 생성한 트레이딩 시그널 목록' })
  @ApiResponse({ status: 200, description: '전략 시그널 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async getSignals(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategySignalsQuery(user.id, id));
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '전략 실행 로그 조회 (필터 지원)' })
  @ApiResponse({ status: 200, description: '전략 로그 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  @ApiQuery({ name: 'cursor', required: false, description: '페이지네이션 커서' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'action', required: false, description: '로그 액션 유형 필터' })
  @ApiQuery({ name: 'signal', required: false, description: '시그널 유형 필터' })
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
