import {
  Controller,
  Get,
  Post,
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
import { CreateOrderCommand, CancelOrderCommand } from './commands';
import { GetOrdersQuery, GetOrderQuery } from './queries';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponse, OrderListResponse } from './dto/order-response.dto';
import type { User } from '@coin/database';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: '지정된 거래소에 새 주문 생성',
    description:
      '## 주문 실행 플로우\n\n' +
      '```mermaid\n' +
      'sequenceDiagram\n' +
      '  participant C as 클라이언트\n' +
      '  participant A as API 서버\n' +
      '  participant K as Kafka\n' +
      '  participant W as Worker\n' +
      '  participant E as 거래소\n' +
      '  C->>A: POST /orders {exchange, symbol, side, type}\n' +
      '  A->>A: 주문 생성 (상태: pending)\n' +
      '  A->>K: OrderRequestedEvent 발행\n' +
      '  A-->>C: 201 주문 생성 완료\n' +
      '  K->>W: 주문 요청 소비\n' +
      '  W->>E: 거래소 API로 주문 실행\n' +
      '  E-->>W: 주문 결과\n' +
      '  W->>K: OrderResultEvent 발행\n' +
      '  K->>A: 결과 소비\n' +
      '  A->>A: 주문 상태 업데이트\n' +
      '  A-->>C: WebSocket 알림\n' +
      '```\n' +
      '\n\n거래소에 새 주문을 생성합니다. 모의(paper) 모드에서는 가상 체결, 실전(real) 모드에서는 실제 거래소 API를 통해 주문이 실행됩니다. 주문 결과는 WebSocket으로 실시간 알림됩니다.',
  })
  @ApiResponse({ status: 201, description: '주문 생성 성공', type: OrderResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.commandBus.execute(new CreateOrderCommand(user.id, dto));
  }

  @Get()
  @ApiOperation({
    summary: '주문 목록 조회 (필터링 및 커서 페이지네이션 지원)',
    description:
      '사용자의 주문 내역을 조회합니다. 상태(pending/filled/failed), 거래소, 심볼, 모드(모의/실전), 방향(매수/매도)으로 필터링할 수 있습니다. 커서 기반 페이지네이션을 지원합니다.',
  })
  @ApiResponse({ status: 200, description: '주문 목록 반환', type: OrderListResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiQuery({ name: 'cursor', required: false, description: '페이지네이션 커서' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'status', required: false, description: '주문 상태 필터' })
  @ApiQuery({ name: 'exchange', required: false, description: '거래소 필터' })
  @ApiQuery({ name: 'symbol', required: false, description: '심볼 필터' })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: '거래 모드 필터 (모의/실전)',
  })
  @ApiQuery({ name: 'side', required: false, description: '주문 방향 필터 (매수/매도)' })
  async findAll(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('exchange') exchange?: string,
    @Query('symbol') symbol?: string,
    @Query('mode') mode?: string,
    @Query('side') side?: string,
  ) {
    return this.queryBus.execute(
      new GetOrdersQuery(
        user.id,
        cursor,
        limit ? parseInt(limit, 10) : undefined,
        status,
        exchange,
        symbol,
        mode,
        side,
      ),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'ID로 특정 주문 조회',
    description:
      '주문 ID로 특정 주문의 상세 정보를 조회합니다. 체결 가격, 수량, 수수료 등을 확인할 수 있습니다.',
  })
  @ApiResponse({ status: 200, description: '주문 상세 반환', type: OrderResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '주문 ID' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetOrderQuery(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ID로 대기 중인 주문 취소',
    description:
      '대기 중(pending/placed) 상태의 주문을 취소합니다. 이미 체결된 주문은 취소할 수 없습니다.',
  })
  @ApiResponse({ status: 200, description: '주문 취소 성공', type: OrderResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '주문 ID' })
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new CancelOrderCommand(user.id, id));
  }
}
