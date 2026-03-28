import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '사용자 이메일 주소', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '사용자 비밀번호', example: 'P@ssw0rd!' })
  @IsString()
  password!: string;
}
