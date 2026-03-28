import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const isProd = process.env.NODE_ENV === 'production';

export class SignupDto {
  @ApiProperty({ description: '사용자 이메일 주소', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: '사용자 비밀번호 (프로덕션 환경: 8자 이상, 대소문자/숫자/특수문자 포함)',
    example: 'P@ssw0rd!',
  })
  @IsString()
  @MinLength(isProd ? 8 : 4)
  @Matches(isProd ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/ : /./, {
    message: isProd
      ? 'Password must contain uppercase, lowercase, number, and special character'
      : 'Password is too short',
  })
  password!: string;

  @ApiPropertyOptional({ description: '사용자 표시 닉네임', example: 'trader_kim' })
  @IsString()
  @IsOptional()
  nickname?: string;
}
