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
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { NaverAuthGuard } from './guards/naver-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { SignupDto } from './dto/signup.dto';
import type { User } from '@coin/database';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('signup')
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
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    return { id: user.id, email: user.email, nickname: user.nickname };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
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
  google() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    res.redirect(this.config.get('OAUTH_REDIRECT_URL', '/markets'));
  }

  // --- OAuth: Kakao ---
  @Public()
  @UseGuards(KakaoAuthGuard)
  @Get('kakao')
  kakao() {}

  @Public()
  @UseGuards(KakaoAuthGuard)
  @Get('kakao/callback')
  async kakaoCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    res.redirect(this.config.get('OAUTH_REDIRECT_URL', '/markets'));
  }

  // --- OAuth: Naver ---
  @Public()
  @UseGuards(NaverAuthGuard)
  @Get('naver')
  naver() {}

  @Public()
  @UseGuards(NaverAuthGuard)
  @Get('naver/callback')
  async naverCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.tokenService.issueTokenPair(user);
    this.tokenService.setCookies(res, tokens);
    res.redirect(this.config.get('OAUTH_REDIRECT_URL', '/markets'));
  }
}
