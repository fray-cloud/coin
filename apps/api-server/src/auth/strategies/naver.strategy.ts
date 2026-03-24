import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('NAVER_CLIENT_ID'),
      clientSecret: config.get('NAVER_CLIENT_SECRET'),
      callbackURL: config.get('NAVER_CALLBACK_URL'),
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      email?: string;
      nickname?: string;
      profile_image?: string;
    },
    done: (error: Error | null, user?: unknown) => void,
  ) {
    const email = profile.email;
    if (!email) return done(new Error('No email from Naver'));

    const user = await this.authService.validateOAuthUser('naver', profile.id, {
      email,
      nickname: profile.nickname,
      profileImage: profile.profile_image,
    });
    done(null, user);
  }
}
