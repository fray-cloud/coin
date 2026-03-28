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
import { CreateExchangeKeyCommand, DeleteExchangeKeyCommand } from './commands';
import {
  GetExchangeKeysQuery,
  GetBalancesQuery,
  GetOpenOrdersQuery,
  GetMarketsQuery,
} from './queries';
import { CreateExchangeKeyDto } from './dto/create-exchange-key.dto';
import type { User } from '@coin/database';

@ApiTags('Exchange Keys')
@ApiBearerAuth('access-token')
@Controller('exchange-keys')
export class ExchangeKeysController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: '새 거래소 API 키 등록',
    description:
      '## API 키 등록 플로우\n\n1. 거래소, API 키, 시크릿 키 입력\n2. 서버가 해당 키로 거래소 API 호출하여 유효성 검증\n3. 암호화 후 DB에 저장\n4. 이후 실전 거래 시 해당 키 사용\n\n거래소 API 키를 등록합니다. 등록 시 해당 키로 거래소에 테스트 요청을 보내 유효성을 검증합니다. 키는 암호화되어 저장됩니다.\n\n지원 거래소: Upbit, Binance, Bybit',
  })
  @ApiResponse({ status: 201, description: 'API 키 등록 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async create(@CurrentUser() user: User, @Body() dto: CreateExchangeKeyDto) {
    return this.commandBus.execute(new CreateExchangeKeyCommand(user.id, dto));
  }

  @Get()
  @ApiOperation({
    summary: '등록된 거래소 API 키 목록 조회',
    description: '등록된 모든 거래소 API 키 목록을 반환합니다. 키 값 자체는 노출되지 않습니다.',
  })
  @ApiResponse({ status: 200, description: 'API 키 목록 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async findAll(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetExchangeKeysQuery(user.id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '등록된 거래소 API 키 삭제',
    description:
      '등록된 거래소 API 키를 삭제합니다. 해당 키를 사용하는 전략이 있으면 실전 모드 실행이 중단됩니다.',
  })
  @ApiResponse({ status: 200, description: 'API 키 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '거래소 키 ID' })
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteExchangeKeyCommand(user.id, id));
  }

  @Get(':id/balances')
  @ApiOperation({
    summary: '저장된 API 키로 거래소 잔고 조회',
    description:
      '저장된 API 키로 거래소에 직접 잔고를 조회합니다. 통화별 사용 가능/잠금 금액을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '잔고 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '거래소 키 ID' })
  async getBalances(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetBalancesQuery(user.id, id));
  }

  @Get(':id/orders')
  @ApiOperation({
    summary: '거래소 미체결 주문 조회 (심볼 필터 지원)',
    description: '저장된 API 키로 거래소의 미체결 주문을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '미체결 주문 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '거래소 키 ID' })
  @ApiQuery({ name: 'symbol', required: false, description: '심볼 필터' })
  async getOpenOrders(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('symbol') symbol?: string,
  ) {
    return this.queryBus.execute(new GetOpenOrdersQuery(user.id, id, symbol));
  }

  @Get(':id/markets')
  @ApiOperation({
    summary: '거래소 이용 가능 마켓 조회',
    description: '거래소에서 이용 가능한 마켓(거래 쌍) 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '마켓 목록 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiParam({ name: 'id', description: '거래소 키 ID' })
  async getMarkets(@CurrentUser() user: User, @Param('id') id: string) {
    return this.queryBus.execute(new GetMarketsQuery(user.id, id));
  }
}
