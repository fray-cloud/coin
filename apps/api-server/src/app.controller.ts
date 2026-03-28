import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: '서비스 상태를 반환하는 기본 헬스 체크' })
  @ApiResponse({ status: 200, description: '서비스 정상' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'api-server',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: '데이터베이스 연결을 확인하는 준비 상태 체크' })
  @ApiResponse({ status: 200, description: '서비스 준비 완료, DB 연결 정상' })
  @ApiResponse({ status: 503, description: '서비스 미준비 상태' })
  readyCheck() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)]);
  }
}
