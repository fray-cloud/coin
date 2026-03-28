import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const isProd = process.env.NODE_ENV === 'production';

export class SignupDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description:
      'User password (min 8 chars in production with uppercase, lowercase, number, and special character)',
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

  @ApiPropertyOptional({ description: 'User display nickname', example: 'trader_kim' })
  @IsString()
  @IsOptional()
  nickname?: string;
}
