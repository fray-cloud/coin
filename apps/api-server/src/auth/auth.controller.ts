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
  @ApiOperation({ summary: 'Register a new user account with email and password' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or email already exists' })
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
  @ApiOperation({ summary: 'Log in with email and password credentials' })
  @ApiResponse({ status: 200, description: 'Login successful, tokens set in cookies' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Log out and revoke the current refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Rotate the refresh token and issue new access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
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
  @ApiOperation({ summary: 'Retrieve the currently authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Initiate Google OAuth login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google consent screen' })
  google() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback and issue tokens' })
  @ApiResponse({ status: 302, description: 'Redirects to the app after successful login' })
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
  @ApiOperation({ summary: 'Initiate Kakao OAuth login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Kakao consent screen' })
  kakao() {}

  @Public()
  @UseGuards(KakaoAuthGuard)
  @Get('kakao/callback')
  @ApiOperation({ summary: 'Handle Kakao OAuth callback and issue tokens' })
  @ApiResponse({ status: 302, description: 'Redirects to the app after successful login' })
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
  @ApiOperation({ summary: 'Initiate Naver OAuth login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Naver consent screen' })
  naver() {}

  @Public()
  @UseGuards(NaverAuthGuard)
  @Get('naver/callback')
  @ApiOperation({ summary: 'Handle Naver OAuth callback and issue tokens' })
  @ApiResponse({ status: 302, description: 'Redirects to the app after successful login' })
  async naverCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    this.recordLogin(user.id, req, 'naver');
    res.redirect(this.config.get('OAUTH_REDIRECT_URL', '/markets'));
  }
}
