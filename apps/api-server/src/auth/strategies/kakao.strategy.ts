import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('KAKAO_CLIENT_ID', ''),
      clientSecret: config.get<string>('KAKAO_CLIENT_SECRET', ''),
      callbackURL: config.get<string>('KAKAO_CALLBACK_URL', ''),
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      _json?: {
        kakao_account?: {
          email?: string;
          profile?: { nickname?: string; profile_image_url?: string };
        };
      };
    },
    done: (error: Error | null, user?: unknown) => void,
  ) {
    const kakaoAccount = profile._json?.kakao_account;
    const email = kakaoAccount?.email;
    if (!email) return done(new Error('No email from Kakao'));

    const user = await this.authService.validateOAuthUser('kakao', String(profile.id), {
      email,
      nickname: kakaoAccount?.profile?.nickname,
      profileImage: kakaoAccount?.profile?.profile_image_url,
    });
    done(null, user);
  }
}
