import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

const isProd = process.env.NODE_ENV === 'production';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(isProd ? 8 : 4)
  @Matches(
    isProd ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/ : /./,
    {
      message: isProd
        ? 'Password must contain uppercase, lowercase, number, and special character'
        : 'Password is too short',
    },
  )
  password: string;

  @IsString()
  @IsOptional()
  nickname?: string;
}
