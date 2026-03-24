declare module 'passport-kakao' {
  import { Strategy as PassportStrategy } from 'passport';

  interface StrategyOption {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  interface Profile {
    id: string;
    provider: string;
    _json?: {
      kakao_account?: {
        email?: string;
        profile?: {
          nickname?: string;
          profile_image_url?: string;
        };
      };
    };
  }

  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: unknown) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOption, verify: VerifyFunction);
  }
}
