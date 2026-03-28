import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { NaverAuthGuard } from './guards/naver-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { SignupDto } from './dto/signup.dto';
import { UserResponse, AuthMessageResponse } from './dto/auth-response.dto';
import type { User } from '@coin/database';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async recordLogin(userId: string, req: Request, method: string) {
    try {
      await this.prisma.loginHistory.create({
        data: {
          userId,
          ip: req.ip || req.headers['x-forwarded-for']?.toString() || null,
          userAgent: req.headers['user-agent'] || null,
          method,
        },
      });
    } catch {}
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('signup')
  @ApiOperation({
    summary: '이메일과 비밀번호로 새 계정 등록',
    description:
      '이메일, 비밀번호, 닉네임(선택)으로 새 계정을 생성합니다. 프로덕션 환경에서는 비밀번호 강도 검증이 적용됩니다.',
  })
  @ApiResponse({ status: 201, description: '계정 생성 성공', type: UserResponse })
  @ApiResponse({ status: 400, description: '유효성 검사 오류 또는 이미 존재하는 이메일' })
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.signup(dto);
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    return { id: user.id, email: user.email, nickname: user.nickname };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '이메일/비밀번호로 로그인',
    description:
      '## 인증 플로우\n\n' +
      '```mermaid\n' +
      'sequenceDiagram\n' +
      '  participant C as 클라이언트\n' +
      '  participant A as API 서버\n' +
      '  participant DB as 데이터베이스\n' +
      '  C->>A: POST /auth/login {email, password}\n' +
      '  A->>DB: 자격증명 검증\n' +
      '  DB-->>A: 사용자 확인\n' +
      '  A->>A: JWT 액세스 + 리프레시 토큰 생성\n' +
      '  A->>DB: 리프레시 토큰 저장\n' +
      '  A-->>C: 쿠키 설정 (access_token, refresh_token)\n' +
      '```\n' +
      '\n\n이메일과 비밀번호로 인증합니다. 성공 시 JWT 액세스 토큰(15분)과 리프레시 토큰(7일)이 HttpOnly 쿠키로 설정됩니다. 로그인 이력(IP, User-Agent)이 기록됩니다.',
  })
  @ApiResponse({ status: 200, description: '로그인 성공, 쿠키에 토큰 설정됨', type: UserResponse })
  @ApiResponse({ status: 401, description: '잘못된 자격증명' })
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    this.recordLogin(user.id, req, 'email');
    return { id: user.id, email: user.email, nickname: user.nickname };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '로그아웃 및 리프레시 토큰 폐기',
    description:
      '현재 세션의 리프레시 토큰을 폐기하고 인증 쿠키를 삭제합니다. 로그아웃 이력이 기록됩니다.',
  })
  @ApiResponse({ status: 200, description: '로그아웃 성공', type: AuthMessageResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async logout(
    @Req() req: Request & { user?: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.user?.id) {
      await this.recordLogin(req.user.id, req, 'logout');
    }
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }
    this.tokenService.clearCookies(res);
    return { message: 'Logged out' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '리프레시 토큰 갱신 및 새 토큰 발급',
    description:
      '만료된 액세스 토큰을 리프레시 토큰으로 갱신합니다. 리프레시 토큰도 함께 로테이션됩니다.',
  })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공', type: AuthMessageResponse })
  @ApiResponse({ status: 401, description: '유효하지 않거나 누락된 리프레시 토큰' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      this.tokenService.clearCookies(res);
      throw new UnauthorizedException('No refresh token');
    }
    const tokens = await this.tokenService.rotateRefreshToken(refreshToken);
    this.tokenService.setCookies(res, tokens);
    return { message: 'Tokens refreshed' };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '현재 인증된 사용자 프로필 조회',
    description: '현재 JWT 토큰으로 인증된 사용자의 프로필 정보(ID, 이메일, 닉네임)를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '사용자 프로필 반환', type: UserResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
    };
  }

  // --- OAuth: Google ---
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({
    summary: 'Google OAuth 로그인 시작',
    description: '해당 OAuth 제공자의 동의 화면으로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: 'Google 동의 화면으로 리다이렉트' })
  google() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth 콜백 처리 및 토큰 발급',
    description:
      'OAuth 인증 완료 후 토큰을 발급하고 앱으로 리다이렉트합니다. 신규 사용자는 자동으로 계정이 생성됩니다.',
  })
  @ApiResponse({ status: 302, description: '로그인 성공 후 앱으로 리다이렉트' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    this.recordLogin(user.id, req, 'google');
    res.redirect(this.config.get('OAUTH_REDIRECT_URL', '/markets'));
  }

  // --- OAuth: Kakao ---
  @Public()
  @UseGuards(KakaoAuthGuard)
  @Get('kakao')
  @ApiOperation({
    summary: 'Kakao OAuth 로그인 시작',
    description: '해당 OAuth 제공자의 동의 화면으로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: 'Kakao 동의 화면으로 리다이렉트' })
  kakao() {}

  @Public()
  @UseGuards(KakaoAuthGuard)
  @Get('kakao/callback')
  @ApiOperation({
    summary: 'Kakao OAuth 콜백 처리 및 토큰 발급',
    description:
      'OAuth 인증 완료 후 토큰을 발급하고 앱으로 리다이렉트합니다. 신규 사용자는 자동으로 계정이 생성됩니다.',
  })
  @ApiResponse({ status: 302, description: '로그인 성공 후 앱으로 리다이렉트' })
  async kakaoCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    this.recordLogin(user.id, req, 'kakao');
    res.redirect(this.config.get('OAUTH_REDIRECT_URL', '/markets'));
  }

  // --- OAuth: Naver ---
  @Public()
  @UseGuards(NaverAuthGuard)
  @Get('naver')
  @ApiOperation({
    summary: 'Naver OAuth 로그인 시작',
    description: '해당 OAuth 제공자의 동의 화면으로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: 'Naver 동의 화면으로 리다이렉트' })
  naver() {}

  @Public()
  @UseGuards(NaverAuthGuard)
  @Get('naver/callback')
  @ApiOperation({
    summary: 'Naver OAuth 콜백 처리 및 토큰 발급',
    description:
      'OAuth 인증 완료 후 토큰을 발급하고 앱으로 리다이렉트합니다. 신규 사용자는 자동으로 계정이 생성됩니다.',
  })
  @ApiResponse({ status: 302, description: '로그인 성공 후 앱으로 리다이렉트' })
  async naverCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    this.recordLogin(user.id, req, 'naver');
    res.redirect(this.config.get('OAUTH_REDIRECT_URL', '/markets'));
  }
}
