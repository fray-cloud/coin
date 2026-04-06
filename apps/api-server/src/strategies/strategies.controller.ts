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
  ReorderStrategiesCommand,
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
import { ReorderStrategiesDto } from './dto/reorder-strategies.dto';
import {
  StrategyResponse,
  StrategyPerformanceResponse,
  StrategySignalResponse,
  StrategyLogListResponse,
} from './dto/strategy-response.dto';
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
      '```\n' +
      '\n\n새 트레이딩 전략을 생성합니다. RSI, MACD, Bollinger Bands 유형을 지원하며, 각 전략은 설정된 캔들 간격과 실행 주기에 따라 자동으로 시그널을 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '전략 생성 성공', type: StrategyResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async create(@CurrentUser() user: User, @Body() dto: CreateStrategyDto) {
    return this.commandBus.execute(new CreateStrategyCommand(user.id, dto));
  }

  @Get()
  @ApiOperation({
    summary: '현재 사용자의 모든 전략 조회',
    description:
      '현재 사용자의 모든 전략 목록을 반환합니다. 활성/비활성 상태, 전략 유형, 설정 등을 포함합니다.',
  })
  @ApiResponse({ status: 200, description: '전략 목록 반환', type: [StrategyResponse] })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async findAll(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetStrategiesQuery(user.id));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'ID로 특정 전략 조회',
    description: '전략 ID로 특정 전략의 상세 설정을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '전략 상세 반환', type: StrategyResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategyQuery(user.id, id));
  }

  @Patch(':id')
  @ApiOperation({
    summary: '기존 전략 설정 수정',
    description:
      '전략의 이름, 모드, 파라미터, 리스크 설정, 캔들 간격 등을 수정합니다. 전략 유형과 거래소/심볼은 변경할 수 없습니다.',
  })
  @ApiResponse({ status: 200, description: '전략 수정 성공', type: StrategyResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    return this.commandBus.execute(new UpdateStrategyCommand(user.id, id, dto));
  }

  @Patch(':id/toggle')
  @ApiOperation({
    summary: '전략 활성/비활성 전환',
    description:
      '전략의 활성/비활성 상태를 전환합니다. 활성화하면 Worker가 설정된 간격으로 시그널을 생성합니다.',
  })
  @ApiResponse({ status: 200, description: '전략 전환 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async toggle(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new ToggleStrategyCommand(user.id, id));
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '전략 카드 순서 일괄 업데이트',
    description:
      '전략 목록의 표시 순서를 업데이트합니다. DnD 후 변경된 순서를 저장할 때 사용합니다.',
  })
  @ApiResponse({ status: 204, description: '순서 업데이트 성공' })
  @ApiResponse({ status: 400, description: '잘못된 전략 ID 또는 권한 없음' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async reorder(@CurrentUser() user: User, @Body() dto: ReorderStrategiesDto) {
    return this.commandBus.execute(new ReorderStrategiesCommand(user.id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '전략 영구 삭제',
    description: '전략과 관련된 모든 실행 로그를 함께 영구 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '전략 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteStrategyCommand(user.id, id));
  }

  @Get(':id/performance')
  @ApiOperation({
    summary: '전략 성과 지표 조회',
    description:
      '전략의 성과 지표를 조회합니다. 총 거래 수, 승률, 실현 손익, 일별 누적 P&L을 반환합니다. Signal 모드에서는 시뮬레이션 기반 성과를 계산합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '전략 성과 데이터 반환',
    type: StrategyPerformanceResponse,
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async getPerformance(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategyPerformanceQuery(user.id, id));
  }

  @Get(':id/signals')
  @ApiOperation({
    summary: '전략이 생성한 트레이딩 시그널 목록',
    description: '전략이 생성한 매수/매도 시그널 목록을 반환합니다. 차트의 마커 표시에 사용됩니다.',
  })
  @ApiResponse({ status: 200, description: '전략 시그널 반환', type: [StrategySignalResponse] })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  async getSignals(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetStrategySignalsQuery(user.id, id));
  }

  @Get(':id/logs')
  @ApiOperation({
    summary: '전략 실행 로그 조회 (필터 지원)',
    description:
      '전략의 실행 로그를 조회합니다. 액션(signal_generated/order_placed/risk_blocked/error)과 시그널(buy/sell)로 필터링할 수 있습니다.',
  })
  @ApiResponse({ status: 200, description: '전략 로그 반환', type: StrategyLogListResponse })
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
