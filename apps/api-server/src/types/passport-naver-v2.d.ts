declare module 'passport-naver-v2' {
  import { Strategy as PassportStrategy } from 'passport';

  interface StrategyOption {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  interface Profile {
    id: string;
    email?: string;
    nickname?: string;
    profile_image?: string;
    provider: string;
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
