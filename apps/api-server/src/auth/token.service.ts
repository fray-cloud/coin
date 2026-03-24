import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@coin/database';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokenPair(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwt.sign(payload);

    const refreshRaw = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: user.id, jti: refreshRaw },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const hashed = this.hashToken(refreshRaw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { token: hashed, userId: user.id, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(oldRefreshToken: string) {
    let decoded: { sub: string; jti: string };
    try {
      decoded = this.jwt.verify(oldRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hashed = this.hashToken(decoded.jti);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hashed },
    });

    if (!stored || stored.userId !== decoded.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokenPair(user);
  }

  async revokeRefreshToken(refreshToken: string) {
    try {
      const decoded = this.jwt.verify<{ jti: string }>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const hashed = this.hashToken(decoded.jti);
      await this.prisma.refreshToken.deleteMany({ where: { token: hashed } });
    } catch {
      // token invalid or already deleted — ignore
    }
  }

  setCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProd = this.config.get('NODE_ENV') === 'production';
    const cookieOpts = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('access_token', tokens.accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
